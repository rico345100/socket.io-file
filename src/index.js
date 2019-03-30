/* @flow */
import events from 'events';
import fs from 'fs';
import type { UploadSettings } from './types';

class SocketIOFile extends events.EventEmitter {
	/* Property type defs */
	evPrefix: string;
	socket: IOSocket;
	uploadSettings: UploadSettings;
	uploadIdCounter: number;

	constructor(socket: IOSocket , uploadSettings: UploadSettings) {
		if(!socket) {
			throw new Error('IOSocket is required.');
		}
		else if(!uploadSettings) {
			throw new Error('Upload Settings required');
		} else if(!uploadSettings.directory) {
			throw new Error('Upload Directory required.');
		}

		super();

		this.socket = socket;
		this.uploadSettings = uploadSettings;
		this.uploadIdCounter = 0;
		this.evPrefix = 'socket.io-file';

		// Set default settings
		this.uploadSettings.directory = uploadSettings.directory;
		this.uploadSettings.maxFileSize = +uploadSettings.maxFileSize || undefined;
		this.uploadSettings.accepts = uploadSettings.accepts || [];
		this.uploadSettings.chunkSize = +uploadSettings.chunkSize || 10240;
		this.uploadSettings.transmissionDelay = +uploadSettings.transmissionDelay || 0;
		this.uploadSettings.overwrite = !!uploadSettings.overwrite || false;

		// TODO: Think about "Rename" option

		this.initEvents();
	}

	/**
	 * Initialize Events to receive request from Client
	 */
	initEvents() {
		this.socket.on(`${this.evPrefix}::sync_upload_settings`, this.syncUploadSettings);
		this.socket.on(`${this.evPrefix}::request_upload_id`, this.sendUploadId);
	}

	/**
	 * Sync Upload Settings to Client
	 */
	syncUploadSettings() {
		console.log('Sync Upload Settings');
		const { accepts, maxFileSize, chunkSize, transmissionDelay } = this.uploadSettings;
		
		this.socket.emit(`${this.evPrefix}::sync_upload_settings`, {
			accepts,
			maxFileSize,
			chunkSize,
			transmissionDelay
		});
	}

	/**
	 * Assign new Upload ID
	 * @return {number}
	 */
	assignUploadId(): number {
		return this.uploadIdCounter++;
	}

	/**
	 * Send Upload ID to client
	 */
	sendUploadId() {
		console.log('Sync Upload Settings');
		const id = this.assignUploadId();
		this.socket.emit(`${this.evPrefix}::request_upload_id`, id);
		// After request uploadId, client will send request to create file before upload.
		this.socket.once(`${this.evPrefix}::${id}::request_create_file`, (args) => {
			args.uploadId = id;
			this.createFile(args);
		});
	}

	/**
	 * Create Empty file with Writable Stream
	 * @param {number} param.uploadId
	 * @param {string} param.name
	 * @param {number} param.size
	 */
	createFile({ uploadId, name, size }: { uploadId: number, name: string, size: number }) {
		const { maxFileSize } = this.uploadSettings;
		if(typeof maxFileSize !== 'undefined' && size > maxFileSize) {
			this.socket.emit(`${this.evPrefix}::error`, 'Exceeded max file size.');
			return;
		}

		// TODO: Create Empty File
		// Maybe you should create writableStream and pipe into file,
		// and write ArrayBuffer received from socket
		const { directory } = this.uploadSettings;
		const writeStream = fs.createWriteStream(directory);
		
		this.socket.emit(`${this.evPrefix}::${uploadId}::request_create_file`);
		this.socket.once(`${this.evPrefix}::${uploadId}::stream`, (buffer) => {
			this.writeStream(writeStream, uploadId, buffer);
		});
		this.socket.once(`${this.evPrefix}::${uploadId}::complete`, () => {
			this.closeStream(writeStream, uploadId);
		});

		this.emit('start', {
			uploadId,
			name,
			size
		});
	}

	/**
	 * Write Stream and request client to continue
	 * @param {fs.WriteStream} stream
	 * @param {number} uploadId 
	 * @param {ArrayBuffer} buffer 
	 */
	writeStream(stream: fs.WriteStream, uploadId: number, buffer: ArrayBuffer) {
		stream.write(Buffer.from(buffer));

		// Send client to continue
		this.socket.emit(`${this.evPrefix}::${uploadId}::stream`);
		this.socket.once(`${this.evPrefix}::${uploadId}::stream`, (buffer) => {
			this.writeStream(stream, uploadId, buffer);
		});

		this.emit('stream', {
			uploadId,
			byteLength: buffer.byteLength
		});
	}

	/**
	 * Close Writable Stream to save file
	 * @param {fs.WriteStream} stream
	 * @param {number} uploadId 
	 */
	closeStream(stream: fs.WriteStream, uploadId: number) {
		stream.close();

		this.emit('complete', () => {
			uploadId
		});
	}

	// TODO: Add Abort
	abortStream(stream: fs.WriteStream, uploadId: number) {

	}
}

module.exports = SocketIOFile;
