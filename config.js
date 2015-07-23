var pe = process.env,
    config = {};

/**
 * To conigure the bot, either set the values here directly -
 * or set environment variables.
 * SEE README.MD FOR DETAILS
 */
config.user = pe.targetUser || 'catalystcode',
config.repo = pe.taretRepo || 'case-studies',
config.botUser = pe.botUser || 'Epic-Stuff-Bot',
config.botPassword = pe.botPassword || '',
config.labelReviewed = pe.labelReviewed || 'peer-reviewed',
config.labelNeedsReview = pe.labelNeedsReview || 'needs-peer-review',
config.reviewsNeeded = pe.reviewsNeeded || 3;
config.instructionsComment = pe.instructionsComment || '';
config.pullRequestsStatus = pe.pullRequestsStatus || 'open';
config.mergeOnReview = pe.mergeOnReview || false;
config.oauth2token = pe.oauth2token || '';
config.excludeLabels = pe.excludeLabels || 'no-review';
config.filenameFilter = pe.filenameFilter || '["23534563463"]';

// Setup Instructions Comment
if (config.instructionsComment === '') {
    var comment = 'Hi! I\'m your friendly/stabby Case Study Bot. For this case study to be labeled as "peer-reviewed", ';
    comment += 'you\'ll need as least ' + config.reviewsNeeded + ' comments containing the magic phrase "LGTM" ';
    comment += '("Looks good to me" also works, for those of us that are really verbose).';
    config.instructionsComment = comment;
}

if (config.instructionsComment.indexOf('{reviewsNeeded}')) {
    config.instructionsComment = config.instructionsComment.replace('{reviewsNeeded}', config.reviewsNeeded);
}

module.exports = config;