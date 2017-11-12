"use strict";
const fs = require('fs');
const path = require('path');

function mkdirSyncRecursively(dir, mode) {
    try {
        var result = fs.mkdirSync(dir, mode);
    }
    catch(e) {
        if(e.code === 'ENOENT') {
            mkdirSyncRecursively(path.dirname(dir), mode);  // if does not exists, create all parents recursively
            mkdirSyncRecursively(dir, mode);   // retry
        }
    }
}

function createDirectoryIfNotExists(dir) {
	try {
		fs.accessSync(dir, fs.F_OK);
	}
	catch(e) {
		// create directory if not exists
		mkdirSyncRecursively(dir, '0755');
	}
}

module.exports = {
    mkdirSyncRecursively: mkdirSyncRecursively,
    createDirectoryIfNotExists: createDirectoryIfNotExists
};