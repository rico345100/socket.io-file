# Socket.io-file 2.0
Socket.io-file is now 2.0, much improved! See the below for details..!
Also check the client [client module](https://github.com/rico345100/socket.io-file-client) too.


## Major Changes from 1.x to 2.x
Socket.io-file 1.x used Binary String to send files. Binary String is little bit slower than direct Binary writes, and also server used fs.write, not writable stream.
Recently, FileReader.readAsBinaryString() was deprecated, so I updated Socket.io-file to use ArrayBuffer(Object for manipulate Binary Data directly from JavaScript) instead of Binary String.

Also, newer version has much more functionalities, like Server-side MIME type checking, File size limitations.
Even you can configure the size of each transmission(chunk) any value you want, higher value gives you faster upload.


## Features
- Simple is the best.
- File uploads
- Highly improved performance
- Using File Streams to write faster, efficient.
- Checking mime, limit file size
- Multiple file uploads


## Example
You can found full source code here: [Example Page](https://github.com/rico345100/socket.io-file-example)
Or [Browserify Example](https://github.com/rico345100/socket.io-file-example-browserify)


### Server side

```javascript
"use strict";
const express = require('express');
const app = express();
const http = require('http');
const httpServer = http.Server(app);
const io = require('socket.io')(httpServer);
const SocketIOFile = require('socket.io-file');

app.get('/', (req, res, next) => {
	return res.sendFile(__dirname + '/client/index.html');
});

app.get('/app.js', (req, res, next) => {
	return res.sendFile(__dirname + '/client/app.js');
});

app.get('/socket.io.js', (req, res, next) => {
	return res.sendFile(__dirname + '/node_modules/socket.io-client/dist/socket.io.js');
});

app.get('/socket.io-file-client.js', (req, res, next) => {
	return res.sendFile(__dirname + '/node_modules/socket.io-file-client/socket.io-file-client.js');
});

io.on('connection', (socket) => {
	console.log('Socket connected.');

	var uploader = new SocketIOFile(socket, {
		// uploadDir: {			// multiple directories
		// 	music: 'data/music',
		// 	document: 'data/document'
		// },
		uploadDir: 'data',							// simple directory
		accepts: ['audio/mpeg', 'audio/mp3'],		// chrome and some of browsers checking mp3 as 'audio/mp3', not 'audio/mpeg'
		maxFileSize: 4194304, 						// 4 MB. default is undefined(no limit)
		chunkSize: 10240,							// default is 10240(1KB)
		transmissionDelay: 0,						// delay of each transmission, higher value saves more cpu resources, lower upload speed. default is 0(no delay)
		overwrite: true 							// overwrite file if exists, default is true.
	});
	uploader.on('start', (fileInfo) => {
		console.log('Start uploading');
		console.log(fileInfo);
	});
	uploader.on('stream', (fileInfo) => {
		console.log(`${fileInfo.wrote} / ${fileInfo.size} byte(s)`);
	});
	uploader.on('complete', (fileInfo) => {
		console.log('Upload Complete.');
		console.log(fileInfo);
	});
	uploader.on('error', (err) => {
		console.log('Error!', err);
	});
	uploader.on('abort', (fileInfo) => {
		console.log('Aborted: ', fileInfo);
	});
});

httpServer.listen(3000, () => {
	console.log('Server listening on port 3000');
});
```

### Client side

```javascript
var socket = io('http://localhost:3000');
var uploader = new SocketIOFileClient(socket);
var form = document.getElementById('form');

uploader.on('start', function(fileInfo) {
	console.log('Start uploading', fileInfo);
});
uploader.on('stream', function(fileInfo) {
	console.log('Streaming... sent ' + fileInfo.sent + ' bytes.');
});
uploader.on('complete', function(fileInfo) {
	console.log('Upload Complete', fileInfo);
});
uploader.on('error', function(err) {
	console.log('Error!', err);
});
uploader.on('abort', function(fileInfo) {
	console.log('Aborted: ', fileInfo);
});

form.onsubmit = function(ev) {
	ev.preventDefault();
	
	var fileEl = document.getElementById('file');
	var uploadIds = uploader.upload(fileEl, {
		data: { /* Arbitrary data... */ }
	});

	// setTimeout(function() {
		// uploader.abort(uploadIds[0]);
		// console.log(uploader.getUploadInfo());
	// }, 1000);
};
```

```html
<html>
<head>
	<meta charset="UTF-8">
	<title>Socket.io-file 2.x File Upload Example</title>
</head>
<body>
	<h1>Socket.io-file 2.x File Upload Example</h1>
	<p>Select file and click upload button to upload.</p>
	<p>Multiple upload also supports.</p>

	<form id="form">
		<input type="file" id="file" multiple />
		<input type="submit" value="Upload" />
	</form>

	<script src="socket.io.js"></script>
	<script src="socket.io-file-client.js"></script>
	<script src="app.js"></script>
</body>
</html>
```


## API
### constructor SocketIOFile(io socket, Object options)
Create new SocketIOFile object.

Available optionts:
- String uploadDir: String of directory want to upload. This value can be relative or absolute both. Or you can pass the object which has key as identifier, value as directory for multiple directories upload. Client can select the destination if server has multiple upload directories. Check the example to details.
- Array accepts: Array of string that refers mime type. Note that browsers and server can recognize different(like mp3 file, Chrome recognize as "audio/mp3" while server recognize as "audio/mpeg"). See the example to detail later. Default is empty array, which means accept every file.
- Number maxFileSize: Bytes of max file size. Default is undefined, means no limit.
- Number chunkSize: Size of chunk you sending to. Default is 10240 = 1KB. Higher value gives you faster upload, uses more server resources. Lower value saves your server resources, slower upload.
- Number transmissionDelay: Delay of each chunk transmission, default is 0. 0 means no delay, unit is ms. Use this property wisely to save your server resources with chunkSize.
- Boolean overwite: If sets true, overwrite the file if already exists. Default is false, which upload gonna complete immediately if file already exists. 
- **New from 2.0.1** String rename: Rename the file before upload starts.
- **New from 2.0.1** Function rename: Rename the file before upload starts. Return value is use for the name. This option is useful to upload file without overwriting concerns. Check the details from later example.

### Events
SocketIOFile provides these events.

#### ready (ADDED ON 2.0.12)
Fired on ready, means after synchronize meta data from client. Make sure upload after ready event triggered.

#### start
Fired on starting file upload. This means server grant your uploading request and create empty file to begin writes. Argument has:
- String name: Name of the file
- Number size: Size of the file(bytes)
- String uploadDir: Directory for writing.
- Object data: An arbitrary data object that was passed to the client's upload()-function.
- **New from 2.0.31** String originalFileName: When renamed file name, original name also delivers here.

#### stream
Fired on getting chunks from client. Argument has:
- String name
- String uploadDir
- Number size
- Number wrote: Bytes of wrote
- Object data: An arbitrary data object that was passed to the client's upload()-function.

#### complete
Fired on upload complete. Argument has:
- String name
- String uploadDir
- String mime: MIME type that server recognized.
- Number size
- Number wrote
- Number estimated: Estimated uploading time as ms.
- Object data: An arbitrary data object that was passed to the client's upload()-function.
- **New from 2.0.2** String uploadId: Upload ID passing from Client.
- **New from 2.0.31** String originalFileName: When renamed file name, original name also delivers here.

#### abort
Fired on abort uploading.
- String name
- String uploadDir
- Number size
- Number wrote
- Object data: An arbitrary data object that was passed to the client's upload()-function.

#### error
Fired on got an error.
- First argument: Error object. 
- Second argument: Object with the following properties:
-- String uploadId
-- String name
-- String uploadTo
-- Object data: An arbitrary data object that was passed to the client's upload()-function.

#### destroy (ADDED ON 2.0.2)
Fired after destroyed Socket.io-file object


### void SocketIOFile.prototype.destroy(void) (ADDED ON 2.0.2)
Destroy all resources that used in Socket.io-file. It also send some order to the client so that client can clear own resources.


## Multiple uploading path
Socket.io-file supports multiple path upload. You can specify multiple upload path with passing object that has key as identifier, value as actual directory.

```javascript
var uploader = new SocketIOFile(socket, {
	uploadDir: {
		music: 'data/music',
		document: 'data/document'
	}
});
```

Remember, if you are using multiple path upload, client must select which want to upload.

```javascript
uploader.upload(fileEl, {
	uploadTo: 'music'		// upload to data/music
});
```


## Rename before uploads
From version *2.0.1*, you can now rename the file name before upload starts.

```javascript
var path = require('path');
var count = 0;

var uploader = new SocketIOFile(socket, {
	overwrite: false,
	rename: function(filename, fileInfo) {
		var file = path.parse(filename);
        var fname = file.name;
        var ext = file.ext;
	return `${fname}_${count++}.${ext}`;
});
```

Above example changes the filename before upload starts, adding counting value before file extension. 
This makes file always written, because filename never can't same(but only before you restart the server).
If you want to generate some kind of **unique identifier** to the file always, consider to using Date string or other uid generating node modules like node-uuid.
You can easily combine them together, just put in them into rename option.

From version 2.0.13, you can now just pass string directory, without function.

From version 2.0.31, when use rename property(or function), original file name will includes in argument of complete/start event.

```javascript
var upload = new SocketIOFile(socket, {
	rename: 'myNewFilename.xls'
});
```

## FAQ
### Upload 0 bytes
Try to upload after "ready" event fired.


## Browser Supports
This module uses FileReader API with ArrayBuffer, so make sure your browser support it.