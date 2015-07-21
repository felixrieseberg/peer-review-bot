var express = require('express'),
    bot = require('../bot'),
    config = require('../config'),
    debug = require('debug')('case-study-bot:pullrequest'),
    router = express.Router();

/**
 * Respond using a given Express res object
 * @param {Object} res - Express res object
 * @param {string|string[]} message - Either a message or an array filled with messages
 */
function _respond(res, message) {
    if (res && message) {
        if (message.constructor === Array) {
            return res.json({messages: JSON.stringify(message)});
        }
        res.json({message: message});
    }
}

router.get('/', function (req, res) {
    bot.getPullRequests(function (pullRequests) {
        var pr, i;

        // Processing function for each pull request
        function processPullRequest(labelResult) {
            if (labelResult.labeledReviewed) {
                // Already labeled as 'reviewed', we're done here
                debug('PR ' + pr.number + ' already marked as "reviewed", stopping');
                return _respond(res, 'PR ' + pr.number + ' already marked as "reviewed", stopping');
            }

            // Let's get all our comments and check them for approval
            bot.checkForApprovalComments(pr.number, function (approved) {
                var labels, output = [];

                // Check for instructions comment and post if not present
                bot.checkForInstructionsComment(pr.number, function (posted) {
                    if (!posted) {
                        output.push('No intructions comment found on PR ' + pr.number + '; posting instructions comment');
                        debug('No intructions comment found on PR ' + pr.number + '; posting instructions comment');
                        bot.postInstructionsComment(pr.number);
                    }
                });

                // Stop if we already marked it as 'needs-review' and it does need more reviews
                if (labelResult.labeledNeedsReview && !approved) {
                    output.push('PR ' + pr.number + ' already marked as "needs-review", stopping');
                    debug('PR ' + pr.number + ' already marked as "needs-review", stopping');
                    return _respond(res, output);
                }

                labels = labelResult.labels.map(function (label) {
                    return label.name;
                });

                // Update the labels
                output.push('Updating labels for PR ' + pr.number);
                bot.updateLabels(pr.number, approved, labels);

                // If we're supposed to merge, merge
                if (approved && config.mergeOnReview) {
                    output.push('Merging on review set to true, PR approved, merging');
                    bot.merge(pr.number);
                }

                _respond(res, output);
            });
        }

        // For each PR, check for labels
        for (i = 0; i < pullRequests.length; i = i + 1) {
            pr = pullRequests[i];
            bot.checkForLabel(pr.number, processPullRequest);
        }
    });
});

module.exports = router;
