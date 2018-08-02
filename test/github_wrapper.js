/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
var assert = require('assert');
var github = require('../src/lib/github_wrapper')({application_name: 'test'});
var access_token = require('config').test.github_token;

describe('GitHub Wrapper', function () {

    describe('get repos', function () {
        this.timeout(5000);
        it('get list of repos, including rest3d', function (done) {
            github.get_repos(access_token).then(function (repos) {
                assert(repos);
                var first_repo = repos[0];
                assert(first_repo);
                var rest3d_repo_id = 25237389;
                var rest3d = repos.find((r) => (r.id === rest3d_repo_id));
                assert.equal('rest3d-obsolete', rest3d.name, 'rest3d repo should be in the list');
                done();
            }).catch(done);
        });
    });

    describe('get content', function () {
        this.timeout(5000);
        it('get content on master branch', function (done) {
            github.get_content(access_token, "fl4re", "open_bilrost_test_project", "assets/", "").then(function (repos) {
                assert.equal(repos.length, 3);
                assert.equal(repos[2].name, 'test_1_1_0.level');
                assert.equal(repos[2].path, '.bilrost/assets/test_1_1_0.level');
                done();
            }).catch(done);
        });
        it('get content on a secondary branch', function (done) {
            github.get_content(access_token, "fl4re", "open_bilrost_test_project", "assets/", "good_repo").then(function (repos) {
                assert.equal(repos.length, 3);
                assert.equal(repos[2].name, 'test_1_1_0.level');
                assert.equal(repos[2].path, '.bilrost/assets/test_1_1_0.level');
                done();
            }).catch(done);
        });
    });

    describe('get branch', function () {
        this.timeout(5000);
        it('get test branch', function (done) {
            github.get_branches(access_token, "fl4re", "open_bilrost_test_project", "good_repo").then(function (branches) {
                assert.equal(branches[0].name, "good_repo");
                done();
            }).catch(done);
        });
        it('get branches', function (done) {
            github.get_branches(access_token, "fl4re", "open_bilrost_test_project", "").then(function (branches) {
                assert.equal(true, branches.length > 3);
                assert.equal(branches[0].name, 'bad_repo');
                assert.equal(branches[1].name, 'good_repo');
                assert.equal(branches[2].name, 'master');
                done();
            }).catch(done);
        });
    });

});
