/* @flow */
import type { IO, UploadSettings } from './types';

class SocketIOFile {
	/* Property type defs */
	socket: IO;

	constructor(socket: IO, uploadSettings: UploadSettings) {
		this.socket = socket;

		this.initEvents();
	}

	/**
	 * Initialize Events to receive request from Client
	 */
	initEvents() {
		this.socket.on('socket.io-file::upload', this.handleUpload);
		this.socket.on('socket.io-file::uploadCancel', this.handleUploadCancel);
	}

	// TODO: Implement Upload sequences
	handleUpload() {

	}

	// TODO: Implement Cancel sequences
	handleUploadCancel(uploadId: number) {
		
	}
}

module.exports = SocketIOFile;
