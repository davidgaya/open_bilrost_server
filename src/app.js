/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';
const assert = require('assert');

function greet(req, res, next) {
    var user_name = req.authenticated_user && req.authenticated_user.login || "anonymous.";
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify({
        session_id: req.session_id,
        user_name: user_name,
        message: "Hi, " + user_name
    }, null, 4));
    res.end();
    next();
}

module.exports = function (server, config) {
    assert(config.github, "Github configuration missing.");
    assert(config.registry_url, "registry_url configuration missing.");
    assert(config.S3, "S3 configuration missing.");

    var logger = require('./middleware/logger')(server.log);
    var session = require('./middleware/session');
    var session_store = require('./lib/sessions')(config.sessions_file, config.predefined_sessions);
    var authorize = require('./middleware/authorize')(config.github.organizations);
    var github = require('./lib/github_wrapper')(config.github);

    var login = function (req, res, next) {
        //actual login means bind session_id and user info
        session_store.set(req.session_id, req.authenticated_user);
        next();
    };

    server.use(logger);
    server.use(session);

    /* authenticate with session_id */
    server.use(function (req, res, next) {
        const user = session_store.get(req.session_id);
        if (user && new Date() - new Date(user.retrieve_time) > 60*60*1000) {
            //we have to retrieve Orgs and Teams again to see if she has access
            github.get_authorized_user(user.access_token)
              .then(function (github_user) {
                  github_user.access_token = user.access_token;
                  session_store.set(req.session_id, user);
                  req.authenticated_user = user;
                  next();
              })
              .catch(() => {
                  session_store.del(req.session_id);
                  next();
              });
        } else {
            req.authenticated_user = user;
            next();
        }
    });

    /* authenticate with GitHub */
    (function () {
        var github_auth_controller = require('./github_auth_controller')(config);
        server.get('/auth/access_code', github_auth_controller.redirect_to_remote_login);
        server.get('/auth/access_token', github_auth_controller.authenticate, login, greet);
    })();

    /* authenticate with npm private registry token */
    (function () {
        var extract_bearer_token = require('./middleware/bearer')();
        var get_user_from_registry = require('./middleware/registry_user')(config.registry_url);
        server.post('/rest3d/login', extract_bearer_token, get_user_from_registry, login, greet);
    })();

    /* standard rest3d services */
    server.get('/', greet);
    server.get('/private', authorize, greet);
    server.get('/warehouse/origin', authorize, function (req, res, next) {
        var obj = {
            origin: "https://" + config.S3.BUCKET + ".s3-" + config.S3.REGION + ".amazonaws.com/"
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(obj, null, 4));
    });
    server.post('/warehouse/signed_url', authorize, function (req, res, next) {
        const input = {
            headers: req.body.headers,
            queries: req.body.queries,
            hash: req.body.hash,
            method: req.body.method.toUpperCase(),
            id: req.body.id
        };
        const build_signed_url = require('./lib/signed_amazon_url')(config.S3,config.CF);
        const signed_url = build_signed_url(input);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ signed_url: signed_url }, null, 4));
    });
    server.get('/rest3d/user', authorize, function (req, res, next) {
        var obj = {
            displayName: req.authenticated_user.login,
            email: req.authenticated_user.email
        };
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify(obj, null, 4));
    });

    /* project services */
    const projects_controller = require('./projects_controller')(config);
    (function () {
        const projects_asset_regexp = /^\/contentbrowser\/projects\/([\w \.-]*)\/([\w \.-]*)(?:\/)?(.*)?\/(assets\/.*)/;
        server.get(projects_asset_regexp, authorize, projects_controller.get_assets);
    })();
    (function() {
        const branches_regexp = /^\/contentbrowser\/projects\/([\w \.-]*)\/([\w \.-]*)\/(.*)/;
        server.get(branches_regexp, authorize, projects_controller.get_branches);
    })();
    (function () {
        const projects_regexp = /^\/contentbrowser\/projects\/([\w \.-]*)?(?:\/)?([\w \.-]*)?/;
        server.get(projects_regexp, authorize, projects_controller.get_projects);
    })();
};
