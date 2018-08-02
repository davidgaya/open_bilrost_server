/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

var PORT = process.env.PORT || 3000;
var restify = require('restify');
var bunyan = require('bunyan');
var config = require('config');

var server = restify.createServer({
    log: bunyan.createLogger({
        name: 'asset manager backend',
        serializers: bunyan.stdSerializers
    })
});

server.use(restify.bodyParser());
server.use(restify.queryParser());
server.use(restify.CORS());
server.use(restify.requestLogger());

var app = require('./src/app');
app(server, config);

server.listen(PORT, function () {
    server.log.info('Running on port ' + PORT);
});
