/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*
  Restify middleware that checks if request's authenticated_user
  belongs to the defined teams.
  user must be like:
  {
    login: 'user_name',
    teams: {
      {
        slug: 'team_name'
      }
    }
  }
 */
var lodash = require('lodash');
var restify = require('restify');

module.exports = function (organizations) {

    var isAuthorized = function (user) {
        var user_orgs = user.orgs.map(function (org) {return org.login;});
        var common_orgs = lodash.intersection(user_orgs, organizations);
        return common_orgs.length > 0;
    };

    return function (req, res, next) {
        var user = req.authenticated_user;
        if (user && isAuthorized(user)) {
            next();
        } else {
            next(new restify.UnauthorizedError("We don't like you here."));
        }
    };
};
