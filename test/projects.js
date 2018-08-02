/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const assert = require('assert');

const conf = require('config').test;
const PORT = 23490;
const restify = require('restify');
const client = restify.createJsonClient({
    url: 'http://localhost:' + PORT
});

const app = require('../src/app');

const config = {
    predefined_sessions: {
        '1234': {
            login: 'fake_user_name',
            orgs: [{login: 'fl4re'}],
            access_token: conf.github_token,
            retrieve_time: new Date()
        },
        '12345': {
            login: 'fake_user_name',
            orgs: [{login: 'fl4re'}],
            retrieve_time: new Date()
        }
    },
    registry_url: 'not used here',
    github: {
        organizations: ['fl4re']
    },
    S3: {}
};

const test_asset = {
    "comment": "",
    "dependencies": [
        "/resources/test/test"
    ],
    "main": "/resources/test",
    "meta": {
        "author": "",
        "created": "2016-03-16T14:41:10.384Z",
        "modified": "2016-03-18T10:54:05.870Z",
        "ref": "/assets/test_1_1_0.level",
        "version": "1.1.0"
    },
    "semantics": [],
    "tags": []
};

before(function (done) {
    var server = restify.createServer({});
    server.use(restify.queryParser());
    app(server, config);
    server.listen(PORT, done);
});

describe('Projects', function () {
    this.timeout(20000);
    describe("GET /contentbrowser/projects without authorization", function () {
        before(function() {
            client.headers['x-session-id'] = "0000";
        });
        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/', function (err, req, res, obj) {
                if (err) {
                    assert.equal("We don\'t like you here.", err.message);
                    assert.equal(err.statusCode, 401);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects without an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "12345";
        });

        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/', function (err, req, res, obj) {
                if (err) {
                    assert.equal("Request without access token is restricted", err.message);
                    assert.equal(403, err.statusCode);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get a list of projects", function (done) {
            client.get('/contentbrowser/projects/', function (err, req, res, projects) {
                if (err) {return done(err);}
                assert(res.headers['x-session-id'], "missing session header");
                assert(projects);
                assert.equal(projects.kind, "project-list");
                var rest3d = projects.items.find(r => (r.name.includes('open_bilrost_test_project')));
                assert.equal('open_bilrost_test_project', rest3d.name, 'rest3d repo should be in the list');
                done();
            });
        });
    });
    describe('GET /contentbrowser/projects?name=*_project with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get a list of projects", function (done) {
            client.get('/contentbrowser/projects/?name=*_project', function (err, req, res, projects) {
                if (err) {return done(err);}
                assert(res.headers['x-session-id'], "missing session header");
                assert(projects);
                assert.equal(projects.items.length, 1);
                assert.equal(projects.totalItems, 1);
                assert.equal(projects.kind, "project-list");
                var rest3d = projects.items.find(r => (r.name.includes('open_bilrost_test_project')));
                assert.equal('open_bilrost_test_project', rest3d.name, 'rest3d repo should be in the list');
                done();
            });
        });
    });
    describe('GET /contentbrowser/projects/?maxResults=1 with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get a list of projects", function (done) {
            client.get('/contentbrowser/projects/?maxResults=1', function (err, req, res, projects) {
                assert(projects);
                assert.equal(projects.kind, "project-list");
                assert.equal(projects.items.length, 1);
                assert.equal(projects.nextLink, '/contentbrowser/projects/?maxResults=1&start=1');
                client.get(projects.nextLink, function (err, req, res, projects_bis) {
                    assert.equal(projects_bis.items.length, 1);
                    assert.equal(projects_bis.nextLink, '/contentbrowser/projects/?maxResults=1&start=2');
                    done();
                });
            });
        });
    });


    describe("GET /contentbrowser/projects/:org without authorization", function () {
        before(function() {
            client.headers['x-session-id'] = "0000";
        });
        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/fl4re', function (err, req, res, obj) {
                if (err) {
                    assert.equal("We don\'t like you here.", err.message);
                    assert.equal(err.statusCode, 401);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects/:org without an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "12345";
        });

        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/fl4re', function (err, req, res, obj) {
                if (err) {
                    assert.equal("Request without access token is restricted", err.message);
                    assert.equal(403, err.statusCode);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects/:org with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get repos from fl4re organization", function (done) {
            client.get('/contentbrowser/projects/fl4re', function (err, req, res, projects) {
                if (err) {return done(err);}
                assert.equal(res.headers['x-session-id'], "1234");
                assert(projects);
                assert.equal(projects.kind, "project-list");
                var rest3d = projects.items.find(r => (r.name === 'open_bilrost_test_project'));
                assert.equal('open_bilrost_test_project', rest3d.name, 'rest3d repo should be in the list');
                done();
            });
        });
    });
    describe('GET /contentbrowser/projects/:org?name=*_project with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get fl4re organization", function (done) {
            client.get('/contentbrowser/projects/fl4re?name=*_project', function (err, req, res, projects) {
                if (err) {return done(err);}
                assert(res.headers['x-session-id'], "missing session header");
                assert(projects);
                assert.equal(projects.items.length, 1);
                assert.equal(projects.totalItems, 1);
                assert.equal(projects.kind, "project-list");
                var rest3d = projects.items.find(r => (r.name === 'open_bilrost_test_project'));
                assert.equal('open_bilrost_test_project', rest3d.name, 'rest3d repo should be in the list');
                done();
            });
        });
    });
    describe('GET /contentbrowser/projects/:org?maxResults=1 with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get repos from fl4re organization", function (done) {
            client.get('/contentbrowser/projects/fl4re?maxResults=1', function (err, req, res, projects) {
                assert(projects);
                assert.equal(projects.kind, "project-list");
                assert.equal(projects.items.length, 1);
                assert.equal(projects.totalItems, 3);
                assert.equal(projects.nextLink, '/contentbrowser/projects/fl4re?maxResults=1&start=1');
                client.get(projects.nextLink, function (err, req, res, projects_bis) {
                    assert.equal(projects_bis.items.length, 1);
                    assert.equal(projects_bis.totalItems, 3);
                    done();
                });
            });
        });
    });


    describe("GET /contentbrowser/projects/:org/:project_name without authorization", function () {
        before(function() {
            client.headers['x-session-id'] = "0000";
        });
        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project', function (err, req, res, obj) {
                if (err) {
                    assert.equal("We don\'t like you here.", err.message);
                    assert.equal(err.statusCode, 401);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects/:org/:project_name without an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "12345";
        });

        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project', function (err, req, res, obj) {
                if (err) {
                    assert.equal("Request without access token is restricted", err.message);
                    assert.equal(403, err.statusCode);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects/:org/:project_name with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get project", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project', function (err, req, res, project) {
                if (err) {return done(err);}
                assert.equal(res.headers['x-session-id'], "1234");
                assert.equal(project.name, "open_bilrost_test_project");
                done();
            });
        });
    });


    describe("GET /contentbrowser/projects/:org/:project_name/:branch_name without authorization", function () {
        before(function() {
            client.headers['x-session-id'] = "0000";
        });
        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/test', function (err, req, res, obj) {
                if (err) {
                    assert.equal("We don\'t like you here.", err.message);
                    assert.equal(err.statusCode, 401);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects/:org/:project_name/:branch_name with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get test branch", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/master', function (err, req, res, branch) {
                if (err) {return done(err);}
                assert.equal(res.headers['x-session-id'], "1234");
                assert.equal(branch.name, "master");
                done();
            });
        });
    });
     describe('GET /contentbrowser/projects/:org/:project_name/?name=master with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get test branch", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/?name=master', function (err, req, res, branches) {
                if (err) {return done(err);}
                assert.equal(res.headers['x-session-id'], "1234");
                assert(branches);
                assert.equal(branches.kind, "branch-list");
                assert.equal(branches.items.length, 1);
                assert.equal(branches.totalItems, 1);
                const master = branches.items.find(r => (r.name === 'master'));
                assert.equal('master', master.name, 'master branch should be in the list');
                done();
            });
        });
    });
    describe('GET /contentbrowser/projects/:org/:project_name/?maxResults=1 with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });

        it("should get test branch", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/?maxResults=1', function (err, req, res, branches) {
                if (err) {return done(err);}
                assert.equal(res.headers['x-session-id'], "1234");
                assert(branches);
                assert.equal(branches.kind, "branch-list");
                assert.equal(branches.items.length, 1);
                assert.equal(true, branches.totalItems > 3);
                assert.equal(branches.nextLink, '/contentbrowser/projects/fl4re/open_bilrost_test_project/?maxResults=1&start=1');
                const bad_repo = branches.items.find(r => r.name === 'bad_repo');
                assert.equal('bad_repo', bad_repo.name, 'bad_repo branch should be in the list');
                client.get(branches.nextLink, function (err, req, res, branches_bis) {
                    if (err) {return done(err);}
                    assert.equal(res.headers['x-session-id'], "1234");
                    assert(branches_bis);
                    assert.equal(branches_bis.kind, "branch-list");
                    assert.equal(branches_bis.items.length, 1);
                    assert.equal(true, branches.totalItems > 3);
                    const good_repo = branches_bis.items.find(r => (r.name === 'good_repo'));
                    assert.equal('good_repo', good_repo.name, 'test branch should be in the list');
                    done();
                });
            });
        });
    });

    // run succesful tests first due to a bug from github npm module : https://github.com/mikedeboer/node-github/issues/292
    describe('GET /contentbrowser/projects/:project_full_name/:branch_name/assets/ with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });
        it("should get a list of assets", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/assets/', function (err, req, res, assets) {
                if (err) {return done(err);}
                assert(assets);
                assert.equal(assets.kind, "asset-list");
                assert.equal(assets.items.length, 1);
                assert.equal(assets.subnamespaces.length, 2);
                assert.equal(assets.totalItems, 1);
                assert.equal(assets.totalSubnamespaces, 2);
                assert.deepEqual(test_asset, assets.items[0]);
                done();
            });
        });
    });

    describe('GET /contentbrowser/projects/:project_full_name/:branch_name/assets/?name=*.level with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });
        it("should get a list of assets with name filter", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/good_repo/assets/?name=*.level', function (err, req, res, assets) {
                if (err) {return done(err);}
                assert(assets);
                assert.equal(assets.kind, "asset-list");
                assert.equal(assets.items.length, 1);
                assert.equal(assets.subnamespaces.length, 2);
                assert.equal(assets.totalItems, 1);
                assert.equal(assets.totalSubnamespaces, 2);
                assert.deepEqual(test_asset, assets.items[0]);
                done();
            });
        });
    });

    describe('GET /contentbrowser/projects/:project_full_name/:branch_name/assets/?maxResults=1 with an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "1234";
        });
        it("should get a list of assets with paging filter", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/good_repo/assets/$prefab/?maxResults=1', function (err, req, res, assets) {
                if (err) {return done(err);}
                assert(assets);
                assert.equal(assets.kind, "asset-list");
                assert.equal(assets.items.length, 1);
                assert.equal(assets.totalItems, 2);
                assert.equal(assets.nextLink, "/contentbrowser/projects/fl4re/open_bilrost_test_project/good_repo/assets/$prefab/?maxResults=1&start=1");
                client.get(assets.nextLink, function (err, req, res, assets) {
                    if (err) {return done(err);}
                    assert(assets);
                    assert.equal(assets.kind, "asset-list");
                    assert.equal(assets.items.length, 1);
                    assert.equal(assets.totalItems, 2);
                    done();
                });
            });
        });
    });

    describe("GET /contentbrowser/projects/:project_full_name/:branch_name/assets/ without authorization", function () {
        before(function() {
            client.headers['x-session-id'] = "0000";
        });
        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/assets/', function (err, req, res, obj) {
                if (err) {
                    assert.equal("We don't like you here.", err.message);
                    assert.equal(err.statusCode, 401);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });
    describe('GET /contentbrowser/projects/:project_full_name/:branch_name/assets/ without an access_token', function () {
        before(function() {
            client.headers['x-session-id'] = "12345";
        });

        it("should get an error", function (done) {
            client.get('/contentbrowser/projects/fl4re/open_bilrost_test_project/assets/', function (err, req, res, obj) {
                if (err) {
                    assert.equal("OAuth2 authentication requires a token or key & secret to be set", err.message);
                    assert.equal(500, err.statusCode);
                    done();
                } else {
                    done('Should be error');
                }
            });
        });
    });

});
