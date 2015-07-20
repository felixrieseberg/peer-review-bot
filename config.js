var pe = process.env,
    config = {};

/**
 * To conigure the bot, either set the values here directly -
 * or set environment variables.
 */
config.user = pe.targetUser || 'Epic-Stuff-Bot',
config.repo = pe.taretRepo || 'test-chamber',
config.botUser = pe.botUser || 'Epic-Stuff-Bot',
config.botPassword = pe.botPassword || '',
config.labelReviewed = pe.labelReviewed || 'peer-reviewed',
config.labelNeedsReview = pe.labelNeedsReview || 'needs-peer-review',
config.reviewsNeeded = pe.reviewsNeeded || 3;
config.instructionsComment = pe.instructionsComment || '';
config.pullRequestsStatus = pe.pullRequestsStatus || 'all';
config.mergeOnReview = pe.mergeOnReview || false;
config.oauth2key = pe.oauth2key || null;
config.oauth2secret = pe.oauth2secret || null;

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