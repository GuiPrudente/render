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
		let userRooms = usersMap[data.user.Id] || [];

		if (!userRooms.includes(socket.id)) {
			userRooms.push(socket.id); // Add new socket id to the user's room list
			usersMap[data.user.Id] = userRooms;
			socket.join(data.user.Id); // Join the new socket to the user's room
		}

		io.to(data.user.Id).emit('userConnected', { usersMap: usersMap, latestUser: data.user });
	} catch (error) {
		console.error(socket.id + ' :: ' + error);
	}
}

function handleUserDisconnected(socket) {
	console.log(socket.id, ' has disconnected');
	let userId = findUserIdBySocketId(socket.id);
	let userRooms = usersMap[userId];

	if (userRooms) {
		userRooms = userRooms.filter((id) => id !== socket.id); // Remove the socket id
		if (userRooms.length === 0) {
			delete usersMap[userId]; // Delete user from map if no sockets are connected
		} else {
			usersMap[userId] = userRooms;
		}
	}

	io.to(userId).emit('userDisconnected', { usersMap: usersMap });
}

io.on('connection', (socket) => {
	console.log(socket.id, ' has connected');
	socket.emit('messageFromServer', { data: 'Welcome to the server!' });

	socket.on('messageFromClient', (dataFromClient) => {
		console.log(dataFromClient);
	});

	socket.on('newMessageToServer', (message) => {
		let userId = findUserIdBySocketId(socket.id);
		console.log('newMessageToServer', message);
		console.log('socket.id', socket.id);
		console.log('userFound', JSON.stringify(userId, null, 4));

		io.to(userId).emit('newMessageToClients', { text: message.message, user: userId });
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

function findUserIdBySocketId(targetSocketId) {
	for (const [userId, socketIds] of Object.entries(usersMap)) {
		if (socketIds.includes(targetSocketId)) {
			return userId;
		}
	}
	return null;
}

console.log('Socket.io server started');
