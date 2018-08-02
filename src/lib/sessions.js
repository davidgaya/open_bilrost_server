/**
* Copyright (C) 2015-2018 Starbreeze AB All Rights Reserved.
*/

'use strict';

/*
  This module is responsible of storing session info by
  session_id.
 */

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

module.exports = (storage_file, predefined_sessions) => {
    // We default to config folder because it is the only one that persist between Docker containers
    const adapter = new FileSync(storage_file || './config/sessions.json');
    const db = low(adapter);

    if (!predefined_sessions) {
        predefined_sessions = {};
    }
    return {
        get: id => {
            if (~Object.keys(predefined_sessions).indexOf(id)) {
                return predefined_sessions[id];
            } else {
                return db.get(id).value();
            }
        },
        set: (id, val) => {
            db.set(id, val).write();
        },
        del: id => db.unset(id)
    };
};
