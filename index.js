"use strict";
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const fs = require('fs');
const path = require('path');

const files = {};
const CHUNK_SIZE = 524288;
const MAX_BUFFER_SIZE = 10485760;

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

function SocketIOFile(socket, options) {
    var self = this;
    options = options || {};

	this.socket = socket;
    this.uploadDir = '';

    // create upload dir if not exists
    if(options.uploadDir) {
        let dir = options.uploadDir;

        try {
            fs.accessSync(dir, fs.F_OK);
        }
        catch(e) {
            // create directory if not exists
            mkdirSyncRecursively(dir, '0755');
        }

        this.uploadDir = dir;
    }

	this.socket.on('socket.io-file::start', (data) => {
		let fileName = data.name;
        
		// Create a new Entry in The Files Variable
		files[fileName] = { 
            size: data.size,
            data: '',
            uploaded: 0,
            path: `${this.uploadDir}/${fileName}`
        };

		let stream = 0;

		try {
            let stat = fs.statSync(`${this.uploadDir}/${fileName}`);

            if(stat.isFile()) {
                files[fileName].uploaded = stat.size;
                stream = stat.size / CHUNK_SIZE;
            }
        }
		// It's a New File
        catch(e) {}

        self.emit('start', data);

        fs.open(`${this.uploadDir}/${fileName}`, 'a', '0755', (err, fd) => {
            if(err) {
                throw err;
            }
            else {
                files[fileName].fd = fd;	 //We store the file handler so we can write to it later

                const streamObj = { 
					stream,
                    size: files[fileName].size,
					uploaded: 0,
					percent: 0
				};

                this.emit('stream', streamObj);
                socket.emit('socket.io-file::stream', streamObj);
            }
        });
	});

	this.socket.on('socket.io-file::stream', (data) => {
		let fileName = data.name;
        files[fileName].uploaded += data.data.length;
        files[fileName].data += data.data;

		// on fully uploaded
        if(files[fileName].uploaded == files[fileName].size) {
            fs.write(files[fileName].fd, files[fileName].data, null, 'Binary', (err, writen) => {
                const streamObj = { 
					stream,
                    size: files[fileName].size,
					uploaded: files[fileName].size,
					percent: (files[fileName].uploaded / files[fileName].size) * 100
				};

                this.emit('stream', streamObj);
                this.emit('complete', {
                    path: files[fileName].path
                });

				socket.emit('socket.io-file::stream', streamObj);
                socket.emit('socket.io-file::complete', {
                    path: files[fileName].path
                });

                delete files[fileName];
            });
        }
		// on reaches buffer limit
        else if(files[fileName].data.length > MAX_BUFFER_SIZE) {
            fs.write(files[fileName].fd, files[fileName].data, null, 'Binary', (err, writen) => {
                files[fileName].data = '';		// clear the buffer

                var stream = files[fileName].uploaded / CHUNK_SIZE;

                const streamObj = { 
					stream,
                    size: files[fileName].size,
					uploaded: files[fileName].uploaded,
					percent: (files[fileName].uploaded / files[fileName].size) * 100
				};

                this.emit('stream', streamObj);
                socket.emit('socket.io-file::stream', streamObj);
            });
		}
        else{
            var stream = files[fileName].uploaded / CHUNK_SIZE;
            
            const streamObj = { 
                stream,
                size: files[fileName].size,
				uploaded: files[fileName].uploaded,
				percent: (files[fileName].uploaded / files[fileName].size) * 100
            };
            
            this.emit('stream', streamObj);
            socket.emit('socket.io-file::stream', streamObj);
        }
	});
}
util.inherits(SocketIOFile, EventEmitter);

module.exports = SocketIOFile;