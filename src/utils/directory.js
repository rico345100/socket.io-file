/* @flow */
const fs = require('fs');
const path = require('path');

function makeDirectoryRecursively(dir: string, mode: number) {
    try {
        const result = fs.mkdirSync(dir, mode);
    }
    catch(e) {
        if(e.code === 'ENOENT') {
            makeDirectoryRecursively(path.dirname(dir), mode);  // if does not exists, create all parents recursively
            makeDirectoryRecursively(dir, mode);   // retry
        }
    }
}

function createDirectoryRecursivelyIfNotExists(dir: string, mode: number = 0o755) {
	try {
		fs.accessSync(dir, fs.F_OK);
	}
	catch(e) {
		// create directory if not exists
		makeDirectoryRecursively(dir, 0o755);
	}
}

module.exports = {
	makeDirectoryRecursively,
	createDirectoryRecursivelyIfNotExists
};