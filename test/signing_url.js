/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
var assert = require('assert');

var PORT = 23487;
var restify = require('restify');
var local_config = require('config');
var url = require('url');
var client = restify.createJsonClient({
    url: 'http://localhost:' + PORT
});

var app = require('../src/app');

var config = {
    predefined_sessions: {
        '1234': {
            login: 'fake_user_name',
            orgs: [{login: 'fl4re'}],
            teams: [{slug: 'cloud'}],
            retrieve_time: new Date()
        }
    },
    registry_url: 'not used here',
    github: {
        organizations: ['fl4re'],
        teams: ['cloud']
    },
    S3: {
        AWS_SECRET: 'secret',
        AWS_ACCESS_KEY: 'access_key',
        BUCKET: 'rest3d',
        AWS_REGION: 'eu-west-1'
    },
    CF: local_config.CF
};

before(function (done) {
    var server = restify.createServer({});
    server.use(restify.queryParser());
    server.use(restify.bodyParser());
    app(server, config);
    server.listen(PORT, done);
});

describe('Amazon signing', function () {
    describe('POST /warehouse/signed_url', function () {
        client.headers['x-session-id'] = "1234";

        it("should get a amazon signed url", function (done) {
            const mock = {
                method: 'post',
                headers: {}
            };
            client.post('/warehouse/signed_url', mock, function (err, req, res, obj) {
                if (err) {
                    return done(err);
                }
                assert(obj);
                assert(obj.signed_url.startsWith('https://rest3d.s3.amazonaws.com/undefined?'), true);
                done();
            });
        });

        it("should get a CF signed url", function (done) {
            const mock = {
                method: 'get',
                headers: {},
                hash: 'test.txt',
                id: 'download'
            };
            client.post('/warehouse/signed_url', mock, function (err, req, res, obj) {
                if (err) {
                    return done(err);
                }
                assert(obj.signed_url);
                var signed_url = url.parse(obj.signed_url);
                var client = restify.createClient({
                    url: signed_url.protocol + '//' + signed_url.host
                });
                client.get(signed_url.path, (err, req) => {
                    req.on('result', (err, res) => {
                        if (err) {
                            return done(err);
                        }
                        let body = '';
                        res.on('data', chunk => {
                            body += chunk;
                        });
                        res.on('end', () => {
                            assert(body === "", true);
                            done();
                        });
                    });
                });
            });
        });
    });
});
