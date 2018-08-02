/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*
    Restify middleware that extracts the token from the
    Authorization headers and puts it as a property of
    the request.
 */
module.exports = function () {

    return function (req, res, next) {
        var authorization = req.headers.authorization || '';
        var parts = authorization.split(' ');
        if (parts[0] === "Bearer") {
            req.token = parts[1];
        }
        next();
    };
};
