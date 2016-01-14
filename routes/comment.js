var express = require('express'),
    bot = require('../src/bot'),
    debug = require('debug')('reviewbot:comment'),
    router = express.Router();

/**
 * Respond using a given Express res object
 * @param {Object} res - Express res object
 * @param {string|string[]} message - Either a message or an array filled with messages
 */
function _respond(res, message) {
    if (res && message) {
        if (message.isArray) {
            return res.json({messages: JSON.stringify(message)});
        } else {
            res.json({message: message});
        }
    }
}

router.post('/', function (req, res) {
    if (!req.body) {
        debug('POST Request received, but no body posted!');
        return res.status(400).json({error: 'POST Request received, but no body posted!'});
    }

    if (!req.body.id) {
        debug('POST Request received, but no id given!');
        return res.status(400).json({error: 'POST Request received, but no id given!'});
    }

    if (!req.body.comment) {
        debug('POST Request received, but no comment given!');
        return res.status(400).json({error: 'POST Request received, but no comment given!'});
    }

    var id = req.body.id,
        comment = req.body.comment;

    bot.postComment(id, comment, function () {
        return _respond(res, 'Sucessfully posted comment');
    });
});

module.exports = router;
