/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const assert = require('assert');
const restify = require('restify');
var app = require('../src/app');

const PORT = 23488;
const client = restify.createJsonClient({
    url: 'http://localhost:' + PORT
});

var mock = {};
const config = {
    github_wrapper: mock,
    github: "not used here, using mock",
    registry_url: "not used here",
    S3: "not used here"
};
var server;
before(function (done) {
    server = restify.createServer({});
    server.use(restify.queryParser());
    app(server, config);
    server.listen(PORT, done);
    server.server.setTimeout(10);
});
after('remove server', function (done) {
    server.close(done);
});

describe('Backend authentification', function () {

    describe('GET /auth/access_code', function () {
        it("redirects to login site", function (done) {
            mock.login_url = () => 'whereever';
            client.get("/auth/access_code", function (err, req, res, obj) {
                assert.ifError(err);
                assert(res.headers['x-session-id'], "missing session header");
                assert.equal(302, res.statusCode);
                assert(res.headers.location, "missing location header");
                assert(/whereever/.test(res.headers.location), "invalid url " + res.headers.location);
                done();
            });
        });
    });

    describe('GET /auth/access_token?code=1234', function () {
        it("gets an access_token and retrieves user info", function (done) {
            mock.access_token = (code) => {
                assert.equal('1234', code);
                return Promise.resolve('fake_token');
            };
            mock.get_authorized_user = (token) => {
                assert.equal('fake_token', token);
                return Promise.resolve({login: 'john_smith'});
            };
            client.get("/auth/access_token?code=1234", function (err, req, res, obj) {
                assert.ifError(err);
                assert.equal(200, res.statusCode);
                assert.equal('john_smith', obj.user_name);
                assert(obj.session_id);
                done();
            });
        });
    });
});
