/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const path = require('path').posix;
const errors = require('./lib/errors');
const GithubProjectPresenter = require('./lib/github_project_presenter');
const url_module = require('url');
const minimatch = require('minimatch');

module.exports =  function (config) {
    const github = require('./lib/github_wrapper')(config.github);

    const parse_query_argument = function(query_argument){
        if(query_argument === undefined){
            query_argument = '';
        }
        return query_argument;
    };

    const handle_output = function(ItemstoWrap, api_name, subnamespacesToWrap) {
        const result = { kind : api_name+"-list", items : ItemstoWrap };
        if(subnamespacesToWrap && subnamespacesToWrap.length){
            result.subnamespaces = subnamespacesToWrap;
        }
        return result;
    };

    const filter_by_name = function (filterName) {
        const filter_name = function(files) {
            files = files || [];
            return files.filter(function (el) {return minimatch(el.name || el.meta.ref.replace(/^.*[\\\/]/, ''), filterName || '*');});
        };
        return function (projects) {
            if( filterName ) {
                projects = filter_name(projects);
            }
            return Promise.resolve(projects);
        };
    };

    const paginate = function (start, maxResults) {
        const slice = function(files) {
            return files.slice(start, start + maxResults);
        };
        return function(projects) {
            let totalItems = projects.length;
            projects = slice(projects);
            if (start + projects.length < totalItems) {
                var indexOfMoreResults = start + maxResults;
            }
            return Promise.resolve([projects, totalItems, indexOfMoreResults]);
        };
    };

    const get_next_url = function(url, next) {
        let parsed_url = url_module.parse(url, true);
        parsed_url.query.start = next;
        parsed_url.search = undefined;  // If search is set it prevails over the query, we must unset it
        return parsed_url.format();
    };

    const get_projects = function (req, res, next) {
        let access_token = req.authenticated_user.access_token;
        let organization = parse_query_argument(req.params[0]);
        let name = parse_query_argument(req.params[1]);
        let name_filter = req.query.name,
            maxResults = parseInt(req.query.maxResults, 10) || 100,
            start = parseInt(req.query.start, 10) || 0;

        let select_projects = function (projects) {
            let is_repo_a_project = function (repo) {
                try {
                    repo.description = JSON.parse(repo.description);
                } catch(e) {
                    return false;
                }
                if ( repo.description && repo.description.type === 'application/vnd.bilrost.project+json') {
                    return true;
                }
                return false;
            };
            projects = projects.filter(is_repo_a_project);
            return projects;
        };

        let add_urls = function(repos) {
            return repos.map(function(repo) {
                repo.resources_url = "/contentbrowser/projects/"+repo.full_name+"/resources/";
                repo.assets_url = "/contentbrowser/projects/"+repo.full_name+"/assets/";
                repo.branches_url = "/contentbrowser/projects/"+repo.full_name+"/";
                return repo;
            });
        };
        let build_response = function (args) {
            let repos = args[0], totalItems = args[1], indexOfMoreResults = args[2];
            let response = [];
            res.setHeader('content-type', 'application/json');

            if( repos instanceof Array ) {
                response = repos.map(repo => new GithubProjectPresenter(repo).present());

                if( organization && name ) {
                    response = add_urls(response)[0];
                } else {
                    response = handle_output( add_urls(response), "project" );
                    response.totalItems = totalItems;
                    if(indexOfMoreResults){
                       response.nextLink = get_next_url( req.url, indexOfMoreResults );
                    }
                }
            } else {
                response.push(new GithubProjectPresenter(repos).present());
                response = add_urls([response])[0];
            }
            res.end(JSON.stringify(response));
            next();
        };
        let handle_error = function (reason) {
            req.log.error(reason);
            if(reason.code && reason.message) {
                res.status(reason.code);
                res.end(reason.message);
            } else {
                let error = errors("Branches").INTERNALERROR(reason);
                res.status(error.statusCode);
                res.end(error.message);
            }
            next();
        };
        if (access_token) {
            github
                .get_repos(access_token, organization, name)
                .then(select_projects)
                .then(filter_by_name(name_filter))
                .then(paginate(start, maxResults))
                .then(build_response)
                .catch(handle_error);
        } else {
            let error = errors("Projects").RESTRICTED("Request without access token");
            res.status(error.statusCode);
            res.end(error.message);
            next();
        }
    };
    let get_assets = function (req, res, next) {
        let access_token = req.authenticated_user.access_token;
        let organization = parse_query_argument(req.params[0]);
        let name = parse_query_argument(req.params[1]);
        let branch_name = parse_query_argument(req.params[2]);
        let asset_uri = parse_query_argument(req.params[3]);
        let name_filter = req.query.name,
            maxResults = parseInt(req.query.maxResults, 10) || 100,
            start = parseInt(req.query.start, 10) || 0;
        let subnamespaces = [];
        let format_assets = function(result) {
            if(result) {
                if ( result instanceof Array ) {
                    return Promise.all(
                        result.map(function(asset){
                            if(asset.type === "dir") {
                                return Promise.resolve({
                                    url: path.join("/contentbrowser/projects/", organization, name, branch_name, asset_uri, asset.name ),
                                    name : asset.name,
                                    isSubnamespace: true
                                });
                            } else if(asset.type === "file") {
                                return github.get_content( access_token, organization, name, asset.path, branch_name ).then(format_assets);
                            }
                        })
                    );
                } else if( typeof result === 'object' ) {
                    let stringToDecode = result.content.trim().replace(/ /g,'');
                    try {
                        return Promise.resolve(JSON.parse(new Buffer(stringToDecode, 'base64').toString("ascii")));
                    } catch(err) {
                        return Promise.reject(err);
                    }
                }
            }
        };
        let sort_subnamespaces = function(content) {
            return content.filter( function(item){
                if(item.isSubnamespace){
                    delete item.isSubnamespace;
                    subnamespaces.push(item);
                    return false;
                } else {
                    return true;
                }
            });
        };
        let build_response = function (args) {
            let content = args[0], totalItems = args[1], indexOfMoreResults = args[2];
            res.setHeader('content-type', 'application/json');
            if( content instanceof Array ) {
                content = handle_output(content, "asset", subnamespaces );
                content.totalItems = totalItems;
                if(subnamespaces.length){
                    content.totalSubnamespaces = subnamespaces.length;
                }
                if(indexOfMoreResults){
                   content.nextLink = get_next_url( req.url, indexOfMoreResults );
                }
            }
            res.end(JSON.stringify(content));
            next();
        };
        let handle_error = function (reason) {
            req.log.error(reason);
            if(reason.code && reason.message) {
                res.status(reason.code);
                res.end(reason.message);
            } else {
                let error = errors("Projects").INTERNALERROR(reason);
                res.status(error.statusCode);
                res.end(error.message);
            }
            next();
        };
        github
            .get_content( access_token, organization, name, asset_uri, branch_name )
            .then(github.handle_redirect)
            .then(format_assets)
            .then(sort_subnamespaces)
            .then(filter_by_name(name_filter))
            .then(paginate(start, maxResults))
            .then(build_response)
            .catch(handle_error);
    };

    let get_branches = function(req, res, next) {
        let access_token = req.authenticated_user.access_token;
        let organization = parse_query_argument(req.params[0]);
        let name = parse_query_argument(req.params[1]);
        let branch_name = parse_query_argument(req.params[2]);
        let name_filter = req.query.name,
            maxResults = parseInt(req.query.maxResults, 10) || 100,
            start = parseInt(req.query.start, 10) || 0;
        let add_urls = function(repos) {
            return repos.map(function(repo) {
                repo.resources_url = "/contentbrowser/projects/"+organization+"/"+name+"/"+repo.name+"/resources/";
                repo.assets_url = "/contentbrowser/projects/"+organization+"/"+name+"/"+repo.name+"/assets/";
                repo.branch_url = "/contentbrowser/projects/"+organization+"/"+name+"/"+repo.name;
                return repo;
            });
        };
        let build_response = function (args) {
            let content = args[0], totalItems = args[1], indexOfMoreResults = args[2];
            const keys = ["name", "kind", "items", "resources_url", "assets_url", "branch_url", "nextLink", "totalItems"];
            res.setHeader('content-type', 'application/json');
            if( content instanceof Array ) {
                if(!branch_name) {
                    content = handle_output(add_urls(content), "branch" );
                    content.totalItems = totalItems;
                    if(indexOfMoreResults){
                       content.nextLink = get_next_url( req.url, indexOfMoreResults );
                    }
                } else if(content.length === 1) {
                    content = add_urls(content)[0];
                }
            } else {
                content = add_urls([content])[0];
            }
            res.end(JSON.stringify(content, keys));
            next();
        };
        let handle_error = function (reason) {
            req.log.error(reason);
            if(reason.code && reason.message) {
                res.status(reason.code);
                res.end(reason.message);
            } else {
                let error = errors("Branches").INTERNALERROR(reason);
                res.status(error.statusCode);
                res.end(error.message);
            }
            next();
        };
        github
            .get_branches(access_token, organization, name, branch_name)
            .then(filter_by_name(name_filter))
            .then(paginate(start, maxResults))
            .then(build_response)
            .catch(handle_error);

    };

    return {
        get_projects: get_projects,
        get_assets: get_assets,
        get_branches: get_branches
    };
};
