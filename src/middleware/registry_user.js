/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

var restify = require('restify');

module.exports = function (registry_url) {
    return function (req, res, next) {
        var token = req.token;
        if (token) {
            var client = restify.createJsonClient({
                url: registry_url,
                headers: {
                    authorization: "Bearer " + token
                },
                version: '*'
            });

            client.get('/-/whoami', function (err, req2, res2, obj) {
                if (err) {
                    next(new restify.UnauthorizedError("We can't find you in registry."));
                } else {
                    req.authenticated_user = {
                        login: obj.username,
                        teams: [ { slug: registry_url } ]
                    };
                    next();
                }
            });
        } else {
            next(new restify.UnauthorizedError("No Authorization Bearer token."));
        }
    };
};
