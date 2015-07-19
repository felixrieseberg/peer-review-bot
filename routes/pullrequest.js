var express = require('express'),
    logger = require('morgan'),
    config = require('../config'),
    bot = require('../bot'),
    router = express.Router();

router.get('/', function (req, res, next) {
    bot.getPullRequests(function (pullRequests) {
        // For each PR, check for labels
        for (var i = 0; i < pullRequests.length; i++) {
            var pr = pullRequests[i];

            bot.checkForLabel(pr.number, function (labelResult) {
                if (labelResult.labeledReviewed) {
                    // Already labeled as 'reviewed', we're done here
                    return console.log('PR ' + pr.number + 'already marked as "reviewed", stopping');;
                }

                // Let's get all our comments and check them for approval
                bot.checkForApprovalComments(pr.number, function (approved) {
                    if (labelResult.labeledNeedsReview && !approved) {
                        // Already labeled as 'needs-review', we're done here
                        return console.log('PR ' + pr.number + 'already marked as "needs-review", stopping');
                    }

                    var labels = labelResult.labels.map(function (label) {
                        return label.name;
                    });

                    // Update the labels
                    updateLabels(pr.number, approved, labels);
                    
                    // Check for comment and post if not present
                    bot.checkForInstructionsComment(function (posted) {
                        if (!posted) {
                            bot.postInstructionsComment(pr.number);
                        }
                    })
                });
            });
        }
    });
});

module.exports = router;
