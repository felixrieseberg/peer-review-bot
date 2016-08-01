var GitHubApi = require('github'),
    debug = require('debug')('reviewbot:bot'),
    config = require('../config');

var options = {version: '3.0.0'}
if (config.github) {
    options.host = config.github;
    options.pathPrefix = "/api/v3";
}
var github = new GitHubApi(options);

/**
 * Private: Authenticate next request
 */
function _authenticate() {
    if ((!config.botUser || !config.botPassword) && !config.oauth2token) {
        throw Error('Fatal: No username/password or no Oauth2 token configured!');
    }

    if (config.oauth2token) {
        github.authenticate({
            type: 'oauth',
            token: config.oauth2token
        });
    } else {
        github.authenticate({
            type: 'basic',
            username: config.botUser,
            password: config.botPassword
        });
    }
}

/**
 * Fetch all pull requests in the currently configured repo
 * @callback {getPullRequestsCb} callback
 */
function getPullRequests(callback) {
    _authenticate();
    /**
     * @callback getPullRequestsCb
     * @param {Object[]} result - Returned pull request objects
     */
    github.pullRequests.getAll({
        user: config.user,
        repo: config.repo,
        state: config.pullRequestStatus
    }, function (error, result) {
        if (error) {
            return debug('getPullRequests: Error while fetching PRs: ', error);
        }

        if (!result || !result.length || result.length < 1) {
            return debug('getPullRequests: No open PRs found');
        }

        if (callback) {
            callback(result);
        }
    });
}

/**
 * Fetch a single pull requests in the currently configured repo
 * @callback {getPullRequestsCb} callback
 */
function getPullRequest(prNumber, callback) {
    _authenticate();
    /**
     * @callback getPullRequestsCb
     * @param {Object[]} result - Returned pull request objects
     */
    debug('GitHub: Attempting to get PR #' + prNumber);

    github.pullRequests.get({
        user: config.user,
        repo: config.repo,
        number: prNumber
    }, function (error, result) {
        if (error) {
            return debug('getPullRequests: Error while fetching PRs: ' + error);
        }

        debug('GitHub: PR successfully recieved. Changed files: ' + result.changed_files);

        if (callback) {
            callback([result]);
        }
    });
}

/**
 * Get all the labels for a PR
 * @param {int} prNumber - Number of PR for which to get all the labels
 * @param {Object} pr - PR to handle
 * @callback {checkForLabelCb} callback
 */
function checkForLabel(prNumber, pr, callback) {
    _authenticate();
    /**
     * @callback checkForLabelCb
     * @param {Object} result - Object describing how the issue is labeled
     */
    if (!prNumber) {
        return debug('checkForLabel: insufficient parameters');
    }

    github.issues.getIssueLabels({
        user: config.user,
        repo: config.repo,
        number: prNumber
    }, function (error, result) {
        var excludeLabels = config.excludeLabels.split(' '),
            labeledNeedsReview = false,
            labeledReviewed = false,
            labeledExclude = false,
            labels = [];

        if (error) {
            return debug('checkForLabel: Error while fetching labels for single PR: ', error);
        }

        // Check if already labeled
        for (var i = 0; i < result.length; i++) {
            labeledNeedsReview = (result[i].name === config.labelNeedsReview) ? true : labeledNeedsReview;
            labeledReviewed = (result[i].name === config.labelReviewed) ? true : labeledReviewed;

            if (excludeLabels && excludeLabels.length && excludeLabels.length > 0) {
                labeledExclude = (excludeLabels.indexOf(result[i].name) > -1) ? true : labeledExclude;
            }

            labels.push(result[i]);
        }

        if (callback) {
            callback({
                labeledNeedsReview: labeledNeedsReview,
                labeledReviewed: labeledReviewed,
                labeledExclude: labeledExclude,
                labels: labels
            }, pr);
        }
    });
}

/**
 * Check a PR for 'LGTM!' comments
 * @param {int} prNumber - Number of PR to check
 * @callback {checkForApprovalComments} callback
 */
function checkForApprovalComments(prNumber, callback) {
    _authenticate();
    /**
     * @callback checkForApprovalCommentsCb
     * @param {boolean} approved - Approved or not?
     */
     if (!prNumber) {
         return debug('checkForApprovalComments: insufficient parameters');
     }

     github.issues.getComments({
         repo: config.repo,
         user: config.user,
         number: prNumber,
         perPage: 99
     }, function (error, result) {
        var lgtm = /(LGTM)|(Looks good to me!)/,
            approvedCount = 0,
            isInstruction, approved;

        if (error) {
            return debug('checkForApprovalComments: Error while fetching coments for single PR: ', error);
        }

        for (var i = 0; i < result.length; i++) {
            if (result[i].body && lgtm.test(result[i].body)) {
                // Test if we're actually just in the instructions comment
                isInstruction = (result[i].body.slice(1, 30).trim() === config.instructionsComment.slice(1, 30).trim());
                approvedCount = (isInstruction) ? approvedCount : approvedCount + 1;
            }
        }

        approved = (approvedCount >= config.reviewsNeeded);

        if (callback) {
            callback(approved);
        }
     });
}

/**
 * Check if a PR already has the instructions comment
 * @param {int} prNumber - Number of PR to check
 * @callback {checkForInstructionsCommentCb} callback
 */
function checkForInstructionsComment(prNumber, callback) {
    _authenticate();
    /**
     * @callback checkForInstructionsCommentCb
     * @param {boolean} posted - Comment posted or not?
     */
    github.issues.getComments({
        user: config.user,
        repo: config.repo,
        number: prNumber
    }, function (error, result) {
        var instructed = false;

        if (error) {
            return debug('commentInstructions: error while trying fetch comments: ', error);
        }

        for (var i = 0; i < result.length; i++) {
            instructed = (result[i].body.slice(1, 30).trim() === config.instructionsComment.slice(1, 30).trim());
            if (instructed) {
                break;
            }
        }

        if (callback) {
            callback(instructed);
        }
    });
}

/**
 * Checks if the files changed in a PR are the ones we're scanning for
 * @param {int} prNumber - Number of PR
 * @callback {checkForFilesCb} callback
 */
function checkForFiles(prNumber, callback) {
    /**
     * @callback checkForFilesCb
     * @param {boolean} matched - Does this pr contain files that match the filename filter?
     */
    var filenameFilter = (config.filenameFilter) ? JSON.parse(config.filenameFilter) : [];

    // Bail out if filter not set, return 'true'
    if (!filenameFilter || filenameFilter.length < 1) {
        return callback(true);
    }

    _authenticate();

    github.pullRequests.getFiles({
        user: config.user,
        repo: config.repo,
        number: prNumber
    }, function (error, result) {
        var match = false,
            i, ii;

        if (error) {
            return debug('commentInstructions: error while trying fetch comments: ', error);
        }

        for (i = 0; i < result.length; i = i + 1) {
            for (var ii = 0; ii < filenameFilter.length; ii = ii + 1) {
                match = (result[i].filename.indexOf(filenameFilter[ii]) > -1) ? true : match;
                if (match) {
                    return callback(true);
                }
            }
        }

        return callback(match);
    });
}

/**
 * Check the commit status is in success state
 * @param {string} sha - the commit sha1
 * @callback {checkForStatusCb} callback
 */
function checkForStatus(sha, callback) {
    _authenticate()
    github.repos.getCombinedStatus({
        user: config.user,
        repo: config.repo,
        sha: sha
    }, function(error, result) {
        if (error) {
            return debug('checkForStatus: error while trying get combined status: ', error)
        }
        return callback(result.state == 'success')
    })
}

/**
 * Label PR as approved / not approved yet
 * @param {int} prNumber - Number of PR
 * @param {boolean} approved - 'True' for 'peer-reviewed'
 * @param {sring[]} labels - Previously fetched labels
 * @callback {updateLabelsCb} callback
 */
function updateLabels(prNumber, approved, labels, callback) {
    /**
     * @callback updateLabelsCb
     * @param {Object} result - Result returned from GitHub
     */

    var changed = false;

    labels = (!labels || !labels.length) ? [] : labels;

    if ((approved !== true && approved !== false) || !prNumber) {
        return debug('labelPullRequest: insufficient parameters');
    }

    // Adjust labels for approved / not approved
    if (approved && labels.indexOf(config.labelNeedsReview) > -1) {
        labels.splice(labels.indexOf(config.labelNeedsReview), 1);
        changed = true;
    }
    if (approved && labels.indexOf(config.labelReviewed) === -1) {
        labels.push(config.labelReviewed);
        changed = true;
    }

    if (!approved && labels.indexOf(config.labelReviewed) > -1) {
        labels.splice(labels.indexOf(config.labelReviewed), 1);
        changed = true;
    }
    if (!approved && labels.indexOf(config.labelNeedsReview) === -1) {
        labels.push(config.labelNeedsReview);
        changed = true;
    }

    if (changed) {
        _authenticate();
        github.issues.edit({
            user: config.user,
            repo: config.repo,
            number: prNumber,
            labels: JSON.stringify(labels)
        }, function (error, result) {
            if (error) {
                return debug('labelPullRequest: error while trying to label PR: ', error);
            }
            if (callback) {
                callback(result);
            }
        });
    }
}

/**
 * Post the instructions comment to a PR
 * @param {int} prNumber - Number of the PR to post to
 * @callback {postInstructionsCommentCb} callback
 */
function postInstructionsComment(prNumber, callback) {
    /**
     * @callback postInstructionsCommentCb
     * @param {Object} result - Result returned from GitHub
     */
    postComment(prNumber, config.instructionsComment, callback);
}

/**
 * Post a comment to an issue
 * @param {int} number - Number of the PR/issue to post to
 * @param {string} comment - Comment to post
 * @callback {postCommentCb} callback
 */
function postComment(number, comment, callback) {
    /**
     * @callback postCommentCb
     * @param {Object} result - Result returned from GitHub
     */
    _authenticate();
    github.issues.createComment({
        user: config.user,
        repo: config.repo,
        number: number,
        body: comment
    }, function (error, result) {
        if (error) {
            return debug('postComment: Error while trying to post instructions:', error);
        }
        if (callback) {
            callback(result);
        }
    });
}

/**
 * Merge a PR
 * @param {int} prNumber - Number of the PR to merge
 * @callback {mergeCb} callback
 */
function merge(prNumber, callback) {
    /**
     * @callback postInstructionsCommentCb
     * @param {mergeCb} result - Result returned from GitHub
     */
    _authenticate();
    github.pullRequests.merge({
        user: config.user,
        repo: config.repo,
        number: prNumber
    }, function (error, result) {
        if (error) {
            return debug('merge: Error while trying to merge PR:', error);
        }
        if (callback) {
            callback(result);
        }
    });
}

module.exports = {
    getPullRequest: getPullRequest,
    getPullRequests: getPullRequests,
    checkForLabel: checkForLabel,
    checkForApprovalComments: checkForApprovalComments,
    checkForInstructionsComment: checkForInstructionsComment,
    checkForFiles: checkForFiles,
    updateLabels: updateLabels,
    checkForStatus: checkForStatus,
    postInstructionsComment: postInstructionsComment,
    postComment: postComment,
    merge: merge
};
