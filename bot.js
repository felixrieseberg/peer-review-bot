var GitHubApi = require('github'),
    config = require('../config'),

var github = new GitHubApi({version: '3.0.0'});
    
/**
 * Fetch all (open) pull requests in the currently configured repo
 * @callback {getPullRequestsCb} callback
 */
function getPullRequests(callback) {
    /**
     * @callback getPullRequestsCb
     * @param {Object[]} result - Returned pull request objects
     */
    github.pullRequests.getAll({
        user: config.user,
        repo: config.repo,
        state: 'all'
    }, function(error, result) {
        if (error) {
            return console.log('getPullRequests: Error while fetching PRs: ', error);
        }

        if (!result || !result.length || result.length < 1) {
            return console.log('getPullRequests: No open PRs found');
        }

        callback(result);
    });
}

/**
 * Get all the labels for a PR
 * @param {int} prNumber - Number of PR for which to get all the labels
 * @callback {checkForLabelCb} callback
 */
function checkForLabel(prNumber, callback) {
    /**
     * @callback checkForLabelCb
     * @param {Object} result - Object describing how the issue is labeled
     */
    if (!prNumber) {
        return console.log('checkForLabel: insufficient parameters');
    }

    github.issues.getIssueLabels({
        user: config.user,
        repo: config.repo,
        number: prNumber
    }, function (error, result) {
        var labeledNeedsReview = false,
            labeledReviewed = false,
            labels = [];

        if (error) {
            return console.log('checkForLabel: Error while fetching labels for single PR: ', error);
        }

        // Check if already labeled
        for (var i = 0; i < result.length; i++) {
            labeledNeedsReview = (result[i].name === config.labelNeedsReview) ? true : labeledNeedsReview;
            labeledReviewed = (result[i].name === config.labelReviewed) ? true : labeledReviewed;
            labels.push(result[i]);
        }

        callback({
            labeledNeedsReview: labeledNeedsReview,
            labeledReviewed: labeledReviewed,
            labels: labels
        })
    });
}

/**
 * Check a PR for 'LGTM!' comments
 * @param {int} prNumber - Number of PR to check
 * @callback {checkForApprovalComments} callback
 */
function checkForApprovalComments(prNumber, callback) {
    /**
     * @callback checkForApprovalCommentsCb
     * @param {boolean} approved - Approved or not?
     */
     if (!prNumber) {
         return console.log('checkForApprovalComments: insufficient parameters');
     }

     github.issues.getComments({
         repo: config.repo,
         user: config.user,
         number: prNumber,
         perPage: 99
     }, function (error, result) {
        var lgtm = /(LGTM)|(Looks good to me!)|w+?/,
            approvedCount = 0,
            approved;

        if (error) {
            return console.log('checkForApprovalComments: Error while fetching coments for single PR: ', error);
        }

        for (var i = 0; i < result.length; i++) {
            if (result[i].body && lgtm.test(result[i].body)) {
                approvedCount = approvedCount + 1;
            }
        }

        approved = (approvedCount >= config.reviewsNeeded);
        callback(approved);
     });
}

/**
 * Check if a PR already has the instructions comment
 * @param {int} prNumber - Number of PR to check
 * @callback {checkForInstructionsCommentCb} callback
 */
function checkForInstructionsComment(prNumber, callback) {
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
            return console.log('commentInstructions: error while trying fetch comments: ', error);
        }
        
        for (var i = 0; i < result.length; i++) {
            instructed = (result[i].indexOf('I\'m your friendly/stabby Case Study Bot. For this') > 1);
            if (instructed) {
                break;
            }
        }
        
        callback(instructed);
    });
}

/**
 * Label PR as approved / not approved yet
 * @param {int} prNumber - Number of PR
 * @param {boolean} approved - 'True' for 'peer-reviewed'
 * @param {sring[]} labels - Previously fetched labels
 */
function updateLabels(prNumber, approved, labels) {
    var changed = false;

    labels = (!labels || !labels.length) ? [] : labels;

    if ((approved !== true && approved !== false) || !prNumber) {
        return console.log('labelPullRequest: insufficient parameters');
    }

    // Adjust labels for approved / not approved
    if (approved && labels.indexOf(config.labelNeedsReview) > -1) {
        labels.removeAt(labels.indexOf(config.labelNeedsReview));
        changed = true;
    } else if (approved && labels.indexOf(config.labelReviewed) === -1) {
        labels.push(config.labelReviewed);
        changed = true;
    }

    if (!approved && labels.indexOf(config.labelReviewed) > -1) {
        labels.removeAt(labels.indexOf(config.labelReviewed));
        changed = true;
    } else if (!approved && labels.indexOf(config.labelNeedsReview) === -1) {
        labels.push(config.labelNeedsReview);
        changed = true;
    }

    if (changed) {
        github.authenticate({
            type: 'basic',
            username: config.botUser,
            password: config.botPassword
        });

        github.issues.edit({
            user: config.user,
            repo: config.repo,
            number: prNumber,
            labels: JSON.stringify(labels)
        }, function (error, result) {
            if (error) {
                return console.log('labelPullRequest: error while trying to label PR: ', error);
            }
        });
    }
}

/**
 * Post the instructions comment to a PR
 * @param {int} prNumber - The number of the PR to post to 
 */
function postInstructionsComment(prNumber) {
    var comment = 'Hi! I\'m your friendly/stabby Case Study Bot. For this case study to be labeled as "peer-reviewed",';
    comment += 'you\'ll need as least ' + config.reviewsNeeded + 'comments containing the magic phrase "LGTM"';
    comment += '("Looks good to me" also works, for those of us that are really verbose).';
    
    github.createComment({
        user: config.user,
        repo: config.repo,
        number: prNumber,
        body: comment
    });
}

module.exports = {
    getPullRequest: getPullRequests,
    checkForLabel: checkForLabel,
    checkForApprovalComments: checkForApprovalComments,
    checkForInstructionsComment: checkForInstructionsComment,
    updateLabels: updateLabels,
    postInstructionsComment: postInstructionsComment
};
