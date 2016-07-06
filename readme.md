# Socket.io-file

Socket.io-file is module for uploading file via Socket.io.

## Example

You can found full source code here: [Example Page](https://github.com/rico345100/socket.io-file-example)
Or [Browserify Example](https://github.com/rico345100/socket.io-file-example-browserify)

### Server side

```javascript
const SocketIOFile = require('socket.io-file');

io.on('connection', (socket) => {
	console.log('connected: ' + socket.id);

	var uploader = new SocketIOFile(socket, {
		uploadDir: 'data/music'
	});

	uploader.on('start', (fileInfo) => {
		console.log('Upload started');
	});
	uploader.on('stream', (data) => {
		console.log('Streaming... ' + data.uploaded + ' / ' + data.size);
	});
	uploader.on('complete', () => {
		console.log('Completed!');
	});
});
```

### Client side

#### HTML
```html
<html>
<head>
	<meta charset="UTF-8">
	<title>Socket File Upload</title>
</head>
<body>
	<div id="UploadBox">
		<h2>File Uploader</h2>
		<span id="UploadArea">
			<label for="FileBox">Choose A File:</label>
			<input type="file" id="FileBox" />
			<br />

			<button type="button" id="UploadButton">Upload</button>
		</span>
	</div>

	<script src="/socket.io.js"></script>
	<script src="/socket.io-file-client.js"></script>
	<script src="/alter.js"></script>
</body>
</html>
```

#### JavaScript
```javascript
var socket = io('http://localhost:3000');

window.addEventListener('load', function() {
	var socketIOFile = new SocketIOFileClient(socket);

	socketIOFile.on('start', function() {
		console.log('File uploading staring...');
	});

	socketIOFile.on('stream', function(data) {
		//console.log('SocketIOFileClient: Client streaming... ' + (Math.round(data.percent * 100)/100) + '%');
		console.log('SocketIOFileClient: Client streaming... ' + data.uploaded + ' / ' + data.size);
	});

	socketIOFile.on('complete', function() {
		console.log('File Uploaded Successfully!');
	});

	document.getElementById('UploadButton').addEventListener('click', function() {
		var file = document.getElementById('FileBox').files[0];
		socketIOFile.upload(file);
	});
});
```


## API
### constructor SocketIOFile(socket, options)

Create new SocketIOFile object. This object automatically handles all file uploads from client via Socket.io.

Options are:
* uploadDir: Path for uploading file. Directory can be recursive, like 'user/data/music'.

#### Since version 1.4, you can set multiple paths. Use upload dir with object. Client can specify the path with a key as 'to' option.

##### Server side

```javascript
var uploader = new SocketIOFile(socket, {
	uploadDir: {
		music: 'data/music',
		image: 'data/image'
	}
});
```

##### Client side

```javascript
document.getElementById('uploadMusic').addEventListener('click', function() {
	var file = document.getElementById('FileBox').files[0];
	socketIOFile.upload(file, {
		types: [
			'audio/mp3'
		],
		to: 'music'
	});
});
document.getElementById('uploadImage').addEventListener('click', function() {
	var file = document.getElementById('FileBox').files[0];
	socketIOFile.upload(file, {
		types: [
			'image/png',
			'image/jpeg',
			'image/pjpeg'
		],
		to: 'image'
	});
});
```


### Event.start(fileInfo)
This event fires when upload begins, sending fileInfo object as first parameter received from Client before sending it. fileInfo object contains: name(file's name) and size(file's size).

### Event.stream(streamData)
This event fires when client sending the data from server, and server receives it. streamData is object that contains:
* Object stream: Internally, this module merge the data from client until file is all uploaded. This stream is part of file that client keep sending it.
* Number size: Total file size.
* Number uploaded: Amount of uploaded.
* Number percent: Percentage of how much uploaded

### Event.complete(uploadedInfo)
This event fires when upload completed. This event has argument for uploaded file info.
* String path: Uploaded path of file.
* String name: Name of the file

## Browser Supports
This module uses FileReader API, so latest browser is required.


Please check the Client side module too. Link: [socket.io-file-client
](https://github.com/rico345100/socket.io-file-client)
