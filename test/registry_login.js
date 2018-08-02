/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
var assert = require('assert');

var PORT = 23489;
var restify = require('restify');
var client = restify.createJsonClient({
    url: 'http://localhost:' + PORT
});

var app = require('../src/app');

var REGISTRY_PORT = 12345;
var registry;
before(function (done) {
    registry = restify.createServer({});
    registry.get('/-/whoami', function (req, res, next) {
        res.end(JSON.stringify({username: 'test_name'}));
        next();
    });
    registry.listen(REGISTRY_PORT, done);
});

var registry_url = 'http://localhost:' + REGISTRY_PORT;
var config = {
    registry_url: registry_url,
    S3: 'not used here',
    github: {
        teams: [registry_url]
    }
};

before(function (done) {
    var server = restify.createServer({});
    app(server, config);
    server.listen(PORT, done);
});

describe('Backend authentification', function () {

    describe('POST /rest3d/login', function () {
        it("should login a session that can be used to retrieve auth objects", function (done) {
            client.headers.Authorization = "Bearer 1234";
            client.post('/rest3d/login',{}, function (err, req, res, obj) {
                if (err) {done(err);}
                assert(res.headers['x-session-id'], "missing session header");
                assert.equal('test_name', obj.user_name);
                done();
            });
        });
    });

});
