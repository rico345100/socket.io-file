"use strict";
const EventEmitter = require('events').EventEmitter;
const util = require('util');
const fs = require('fs');
const path = require('path');
const mime = require('mime');
const mkdirSyncRecursively = require('./utils').mkdirSyncRecursively;
const createDirectoryIfNotExists = require('./utils').createDirectoryIfNotExists;

function SocketIOFile(socket, options) {
	if (!socket) {
		throw new Error('SocketIOFile requires Socket.');
	}

	this.options = options || {};
	this.maxFileSize = +options.maxFileSize || undefined;
	this.accepts = options.accepts || [];
	this.chunkSize = +options.chunkSize || 10240;
	this.transmissionDelay = options.transmissionDelay || 0;
	this.overwrite = !!options.overwrite || false;
	this.rename = options.rename || null;
	this.resume = !!options.resume || false;

	if (!options.uploadDir) {
		throw new Error('No upload directory specified.');
	}

	// check directory is exists
	if (typeof options.uploadDir === 'string') {
		createDirectoryIfNotExists(options.uploadDir);
	}
	else if (typeof options.uploadDir === 'object') {
		for (var key in options.uploadDir) {
			createDirectoryIfNotExists(options.uploadDir[key]);
		}
	}
	else {
		throw new Error('options.uploadDir must be string or object array.');
	}

	this.socket = socket;

	socket.on('socket.io-file::reqSync', () => {
		socket.emit('socket.io-file::recvSync', {
			maxFileSize: this.maxFileSize,
			accepts: this.accepts,
			chunkSize: this.chunkSize,
			transmissionDelay: this.transmissionDelay
		});

		this.emit('ready');
	});

	var self = this;
	var uploadingFiles = {};

	socket.on('socket.io-file::createFile', (fileInfo) => {
		var id = fileInfo.id;
		var uploadDir = null;
		var uploadTo = fileInfo.uploadTo || '';
		var data = fileInfo.data || {};
		var filename = fileInfo.name;

		function sendError(err) {
			socket.emit(`socket.io-file::error::${id}`, {
				message: err.message
			});
			self.emit('error', err, {
				uploadId: id,
				name: filename,
				uploadTo: uploadTo,
				data: data
			});
		}


		if (this.rename) {
			if (typeof this.rename === 'function') {
				filename = this.rename(filename);
			}
			else {
				filename = this.rename;
			}
		}

		if (typeof options.uploadDir === 'string') {
			uploadDir = path.join(options.uploadDir, filename);
		}
		else if (typeof options.uploadDir === 'object') {
			if (!uploadTo) {
				return sendError(new Error('Upload directory must be specified in multiple directories.'));
			}
			else if (options.uploadDir[uploadTo]) {
				uploadDir = path.join(options.uploadDir[uploadTo], filename);
			}
			else {
				return sendError(new Error('Upload directory ' + uploadTo + ' does not exist.'));
			}
		}
		else if (fileInfo.size > this.maxFileSize) {
			return sendError(new Error('Max Uploading File size must be under ' + this.maxFileSize + ' byte(s).'));
		}

		var startTime = new Date();

		this.emit('start', {
			name: filename,
			size: fileInfo.size,
			uploadDir: uploadDir,
			data: data
		});

		const uploadComplete = () => {
			const ws = uploadingFiles[id].writeStream;

			if (ws) {
				ws.end();
			}

			const endTime = new Date();

			const mimeType = mime.lookup(uploadDir);
			const emitObj = {
				name: filename,
				size: uploadingFiles[id].size,
				wrote: uploadingFiles[id].wrote,
				uploadDir: uploadingFiles[id].uploadDir,
				data: uploadingFiles[id].data,
				mime: mimeType,
				estimated: endTime - startTime,
				uploadId: id
			};

			if (this.accepts && this.accepts.length > 0) {
				let found = false;

				for (var i = 0; i < this.accepts.length; i++) {
					let accept = this.accepts[i];

					if (mimeType === accept) {
						found = true;
						break;
					}
				}

				// if mime is invalid, remove files and emit error
				if (!found) {
					fs.unlink(uploadDir);	// no after works.

					let err = new Error('Not Acceptable file type ' + mimeType + ' of ' + filename + '. Type must be one of these: ' + this.accepts.join(', '));
					return sendError(err);
				}
				else {
					self.socket.emit(`socket.io-file::complete::${id}`, emitObj);
					self.emit('complete', emitObj);
				}
			}
			else {
				self.socket.emit(`socket.io-file::complete::${id}`, emitObj);
				self.emit('complete', emitObj);
			}

			// Release event handlers
			socket.removeAllListeners(`socket.io-file::stream::${id}`);
			socket.removeAllListeners(`socket.io-file::done::${id}`);
			socket.removeAllListeners(`socket.io-file::complete::${id}`);
			socket.removeAllListeners(`socket.io-file::abort::${id}`);
			socket.removeAllListeners(`socket.io-file::error::${id}`);

			delete uploadingFiles[id];
		};

		uploadingFiles[id] = {
			writeStream: null,
			name: fileInfo.name,
			size: fileInfo.size,
			wrote: 0,
			uploadDir: uploadDir,
			data: data,
			resume: false,
		};

		// check if file exists
		const isFileExists = fs.existsSync(uploadDir);

		if (isFileExists) {

			const uploadedFileStats = fs.statSync(uploadDir);

			if (this.resume) {

				if (uploadingFiles[id].size > 0) {

					if (uploadingFiles[id].size > uploadedFileStats.size) {

						uploadingFiles[id].wrote = uploadedFileStats.size;
						uploadingFiles[id].resume = true;
						socket.emit(`socket.io-file::resume::${id}`, uploadingFiles[id]);

					} else {

						if (!this.overwrite) return uploadComplete();

					}

				}

			} else {

				if (!this.overwrite) return uploadComplete();

			}

		}

		var writeStream = fs.createWriteStream(uploadDir, {
			flags: uploadingFiles[id].resume ? 'a' : 'w'
		});

		uploadingFiles[id].writeStream = writeStream;

		socket.emit(`socket.io-file::request::${id}`);

		socket.on(`socket.io-file::stream::${id}`, (chunk) => {
			if (uploadingFiles[id].abort) {
				socket.removeAllListeners(`socket.io-file::stream::${id}`);
				socket.removeAllListeners(`socket.io-file::done::${id}`);
				socket.removeAllListeners(`socket.io-file::complete::${id}`);
				socket.removeAllListeners(`socket.io-file::abort::${id}`);
				socket.removeAllListeners(`socket.io-file::error::${id}`);

				uploadingFiles[id].writeStream.end();
				delete uploadingFiles[id];
				return;
			}

			var writeStream = uploadingFiles[id].writeStream;

			function write() {
				let result = (uploadingFiles[id].wrote + chunk.length) > (self.maxFileSize);

				if ((uploadingFiles[id].wrote + chunk.length) > (self.maxFileSize)) {
					return sendError(new Error(`Uploading file size exceeded max file size ${self.maxFileSize} byte(s).`));
				}

				var writeDone = writeStream.write(chunk);
				uploadingFiles[id].wrote += chunk.length;

				self.emit('stream', {
					name: uploadingFiles[id].name,
					size: uploadingFiles[id].size,
					wrote: uploadingFiles[id].wrote,
					uploadDir: uploadingFiles[id].uploadDir,
					data: uploadingFiles[id].data,
					uploadId: id
				});

				if (!writeDone) {
					writeStream.once('drain', () => socket.emit(`socket.io-file::request::${id}`));
				}
				else {
					if (self.transmissionDelay) {
						setTimeout(() => {
							socket.emit(`socket.io-file::request::${id}`);
						}, self.transmissionDelay);
					}
					else {
						socket.emit(`socket.io-file::request::${id}`);
					}
				}
			}

			write();
		});
		socket.on(`socket.io-file::done::${id}`, () => {
			uploadComplete();
		});
		socket.on(`socket.io-file::abort::${id}`, () => {
			uploadingFiles[id].abort = true;

			self.emit('abort', {
				name: uploadingFiles[id].name,
				size: uploadingFiles[id].size,
				wrote: uploadingFiles[id].wrote,
				uploadDir: uploadingFiles[id].uploadDir,
				data: uploadingFiles[id].data,
				uploadId: id
			});
			socket.emit(`socket.io-file::abort::${id}`, {
				name: uploadingFiles[id].name,
				size: uploadingFiles[id].size,
				wrote: uploadingFiles[id].wrote,
				uploadDir: uploadingFiles[id].uploadDir
			});
		});
	});
}

SocketIOFile.prototype.destroy = function () {
	this.emit('destroy');
	this.socket.emit('socket.io-file::disconnectByServer');

	// Clear the resources
	this.removeAllListeners();
	this.socket = null;		// Remove reference of Socket.io
};
util.inherits(SocketIOFile, EventEmitter);

module.exports = SocketIOFile;
