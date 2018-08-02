/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

module.exports = function (log) {

    return function (req, res, next) {
        log.info({req: req});
        next();
        log.info({res: res});
    };
};
