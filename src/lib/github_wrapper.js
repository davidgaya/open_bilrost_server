/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*
 This function converts a node callback function to a promise.
 I don't understand why there is no such function in standard node.
 */
function promisify(f) {
    var g = function () {
        var args = Array.prototype.slice.call(arguments);
        return new Promise(function (fulfill, reject) {
            var callback = function (err) {
                if (err) {
                    return reject(err);
                }
                var args2 = Array.prototype.slice.call(arguments, 1);
                fulfill.apply(undefined, args2);
            };
            args.push(callback);
            f.apply(undefined, args);
        });
    };
    return g;
}

var GitHubApi = require('github');
var uri_template = require('url-template'); // using RFC 6570 for file name
var restify = require('restify');
var Path = require('path').posix;
const lodash = require('lodash');

module.exports = function (config) {
    var request = require('request');
    var github = new GitHubApi({
        version: "3.0.0",
        followRedirects: false,
        headers: {
            "user-agent": config.application_name
        }
    });

    var redirect_base_url = config.api_url;
    var redirect_client = restify.createJsonClient({
        url: redirect_base_url
    });

    function handle_redirect(res, github){
        if( res.meta && ( res.meta.status.includes('302') || res.meta.status.includes('307') ) ) {
            let path = res.meta.location.trim();
            let length = path.length;
            if (path[length - 2] === '%' && path[length - 1] === '2') {
                path = path.slice(0, length - 3);
            }
            path = decodeURIComponent(path);
            return new Promise(function(resolve, reject){
                redirect_client.get(path.split(redirect_base_url).join(''), function (err, req, res, obj) {
                    if(err) {
                        reject(err);
                    } else {
                        resolve(obj);
                    }
                });
            });
        } else {
            return Promise.resolve(res);
        }
    }

    function get_user(access_token) {
        github.authenticate({type: 'oauth', token: access_token});
        return promisify(github.user.get)({});
    }

    function get_orgs(access_token) {
        github.authenticate({type: 'oauth', token: access_token});
        return promisify(github.user.getOrgs)({});
    }

    function get_authorized_user(access_token) {
        return get_user(access_token).then(function (github_user) {
            github_user.retrieve_time = new Date();
            return get_orgs(access_token).then(function (orgs) {
                github_user.orgs = orgs;
                const user_orgs = orgs.map(org => org.login);
                const common_orgs = lodash.intersection(user_orgs, config.organizations);
                if (common_orgs.length > 0) {
                    return github_user;
                } else {
                    throw Error("Unauthorized, not in known organization.");
                }
            });
        });
    }

    function get_repos(access_token, org, project_name) {
        github.authenticate({type: 'oauth', token: access_token});
        return new Promise(function (resolve, reject) {
            var allResults = [];
            var options = { per_page: 100, visibility: 'all', type:'all'};
            var who, method;
            if(org && !project_name){
                who = "repos";
                method = "getFromOrg";
                options = { org: org, per_page: 100, type:'all' };
            } else if(org && project_name){
                who = "repos";
                method = "get";
                options = { repo: project_name, user: org };
            } else {
                who = "repos";
                method = "getAll";
            }
            github[who][method](options, function getRepos(err, result) {
                if (err) {
                    reject(err);
                } else {
                    allResults = allResults.concat(result);
                    if (github.hasNextPage(result)) {
                        github.getNextPage(result, getRepos);
                    } else {
                        resolve(allResults);
                    }
                }
            });
        });
    }

    function get_branches(access_token, org, project_name, branch_name) {
        github.authenticate({type: 'oauth', token: access_token});
        return new Promise(function (resolve, reject) {
            var allResults = [];
            var options, method;
            if(branch_name){
                method = "getBranch";
                options = { per_page: 100, user: org, repo: project_name, branch: branch_name };
            } else {
                method = "getBranches";
                options = { per_page: 100, user: org, repo: project_name };
            }
            github.repos[method](options, function getRepos(err, result) {
                if (err) {
                    reject(err);
                } else {
                    allResults = allResults.concat(result);
                    if (github.hasNextPage(result)) {
                        github.getNextPage(result, get_branches);
                    } else {
                        resolve(allResults);
                    }
                }
            });
        });
    }

    function get_content(access_token, organization, repo_name, asset_uri, branch_name) {
        let path = asset_uri.indexOf('.bilrost') === -1 ? Path.join('.bilrost', asset_uri) : asset_uri;
        if(path[path.length-1] === '/'){ //remove last slash
            path = path.slice(0, -1);
        }
        var paramaters = {
                repo: repo_name,
                path: path,
                user: organization
        };
        if(branch_name) {
            paramaters.ref = branch_name;
        }

        github.authenticate({type: 'oauth', token: access_token});
        return new Promise(function (resolve, reject){
            github.repos.getContent(
                paramaters,
                function(err, res) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(res, github);
                    }
                }
            );
        });
    }

    return {
        get_authorized_user: get_authorized_user,

        access_token: function (code) {
            return new Promise(function (resolve, reject) {
                request({
                    url: config.access_token_url, //URL to hit
                    method: 'POST',
                    headers: {
                        Accept: 'application/json'
                    },
                    form: {
                        client_id: config.client_id,
                        client_secret: config.client_secret,
                        code: code
                    }
                }, function (error, response, body) {
                    var access_token;
                    if (error) {
                        reject(error);
                    } else {
                        try {
                            access_token = JSON.parse(body).access_token;
                        } catch(e) {
                            reject(e);
                        }
                        resolve(access_token);
                    }
                });
            });
        },

        get_user: get_user,
        get_orgs: get_orgs,
        get_content: get_content,
        get_branches: get_branches,
        handle_redirect: handle_redirect,
        login_url: function () {
            return uri_template.parse(config.login_url).expand(config);
        },
        get_repos: get_repos
    };
};
