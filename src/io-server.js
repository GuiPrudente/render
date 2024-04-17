const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3001;

const corsOptions = {
	origin: '*',
	methods: ['GET', 'POST'],
	allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept'],
	credentials: true
};

app.use(cors(corsOptions));

var usersMap = {};

function handleUserConnected(socket, data) {
	try {
		console.log(JSON.stringify(data, null, 4));
		usersMap[socket.id] = data.user;
		usersMap[socket.id].socketId = socket.id;

		io.emit('userConnected', { usersMap: usersMap, latestUser: data.user });
	} catch (error) {
		console.error(socket.id + ' :: ' + error);
	}
}

function handleUserDisconnected(socket) {
	console.log(socket.id, ' has disconnected');
	let latestUser = usersMap[socket.id];

	for (const userId in usersMap) {
		if (usersMap[socket.id]) {
			delete usersMap[socket.id];
			break;
		}
	}
	io.emit('userDisconnected', { usersMap: usersMap, latestUser: latestUser });
}

io.on('connection', (socket) => {
	console.log(socket.id, ' has connected');
	socket.emit('messageFromServer', { data: 'Welcome to the server!' });

	socket.on('messageFromClient', (dataFromClient) => {
		console.log(dataFromClient);
	});

	socket.on('newMessageToServer', (message) => {
		console.log('newMessageToServer', message);
		console.log('socket.id', socket.id);
		console.log('userFound', JSON.stringify(usersMap[socket.id], null, 4));

		io.emit('newMessageToClients', { text: message.message, user: usersMap[socket.id] });
	});

	socket.on('userConnected', (data) => {
		handleUserConnected(socket, data);
	});

	socket.on('disconnect', () => {
		handleUserDisconnected(socket);
	});
});

server.listen(PORT, () => {
	console.log(`Server is running on port ${PORT}`);
});

function findRecordBySocketId(targetSocketId) {
	const dataArray = Object.values(usersMap);

	for (const record of dataArray) {
		if (record.socketId === targetSocketId) {
			return record;
		}
	}

	return null;
}

console.log('Socket.io server started');
