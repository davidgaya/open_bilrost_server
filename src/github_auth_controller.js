/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const restify = require('restify');
const assert = require('assert');

module.exports =  function (config) {
    var github = config.github_wrapper || require('./lib/github_wrapper')(config.github);

    var authenticate = function (req, res, next) {
        var code = req.query.code;
        var error = req.query.error;
        if (error) {return next(Error(error));}
        assert(/^[\x21-\x7E]+$/.test(code));

        github.access_token(code).then(function (access_token) {
            return github.get_authorized_user(access_token).then(function (github_user) {
                github_user.access_token = access_token;
                req.authenticated_user = github_user;
                next();
            });
        }).catch(function (reason) {
            return next(new restify.UnauthorizedError(reason.message));
        });
    };

    return {
        redirect_to_remote_login: function (req, res, next) {
            res.redirect(github.login_url(), next);
        },
        authenticate: authenticate
    };
};
