/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

/*
    utilities for content browser api
    version 2.0.0
 */
'use strict';
module.exports = function(api_name){
    return {
        NOTFOUND : function(element_not_found){
            return { message: api_name+'(s) not found, '+element_not_found, statusCode: 404 };
        },
        APINOTSUPPORTED: function(element_not_supported) {
            return { message: api_name+' not found, "'+element_not_supported+'" is not supported yet', statusCode: 501 };
        },
        FILETYPENOTSUPPORTED: function() {
            return { message: "File type not supported.", statusCode: 400 };
        },
        CORRUPT : function(element_not_valid) {
            return { message: api_name+' corrupted, "'+element_not_valid+'" cannot be found or is invalid', statusCode: 422 };
        },
        URLNOTVALID : function(url) {
            return { message: api_name+' file url not valid, make sure "'+url+'" respect conventional url scheme', statusCode: 404 };
        },
        IDENTIFIERNOTVALID : function(identifier) {
            return { message: api_name+' identifier not valid, "'+identifier+'" must match either /^[a-zA-Z0-9]{40}$/ or /^[[\w\/\.-]*$/ regular expressions for ids or names', statusCode: 409 };
        },
        INTERNALERROR: function(error) {
            return { message: api_name+' programms encoutered an unexpected failure: '+error, statusCode: 500 };
        },
        RESTRICTED: function(what) {
            return { message: what +' is restricted', statusCode: 403 };
        },
        ALREADYEXIST: function(what) {
            return { message: what +' already exist', statusCode: 403 };
        }

    };
};
