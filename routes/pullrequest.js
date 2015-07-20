var express = require('express'),
    bot = require('../bot'),
    debug = require('debug')('case-study-bot:pullrequest'),
    router = express.Router();

function _respond(res, message) {
    if (res && message) {
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
                _respond(res, 'PR ' + pr.number + ' already marked as "reviewed", stopping');
                return debug('PR ' + pr.number + ' already marked as "reviewed", stopping');
            }

            // Let's get all our comments and check them for approval
            bot.checkForApprovalComments(pr.number, function (approved) {
                // Check for comment and post if not present
                bot.checkForInstructionsComment(pr.number, function (posted) {
                    if (!posted) {
                        bot.postInstructionsComment(pr.number);
                    }
                });

                if (labelResult.labeledNeedsReview && !approved) {
                    _respond(res, 'PR ' + pr.number + ' already marked as "needs-review", stopping');
                    return debug('PR ' + pr.number + ' already marked as "needs-review", stopping');
                }

                var labels = labelResult.labels.map(function (label) {
                    return label.name;
                });

                // Update the labels
                bot.updateLabels(pr.number, approved, labels);
                _respond(res, 'Updating labels for PR' + pr.number);
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
