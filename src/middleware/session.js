/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
/*
This restify middleware parses x-session-id header of request.
And sets x-session-id header of the response.
If the request didn't provide a session_id then
a random id is generated.
 */
var crypto = require('crypto');

var generate_session_id = function (cb) {
    crypto.randomBytes(256, function (err, buf) {
        if (err) {
            cb(err);
        } else {
            cb(null, buf.toString('base64'));
        }
    });
};

module.exports = function (req, res, next) {
    if (req.headers['x-session-id']) {
        req.session_id = req.headers['x-session-id'];
        res.setHeader('x-session-id', req.session_id);
        next();
    } else {
        generate_session_id(function (err, sid) {
            req.session_id = sid;
            res.setHeader('x-session-id', sid);
            next();
        });
    }
};
