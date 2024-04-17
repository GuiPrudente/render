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
const userSocketsMap = new Map();

function handleUserConnected(socket, data) {
    const userId = data.user.Id;
    const userSockets = userSocketsMap.get(userId) || new Set();
    userSockets.add(socket.id);
    userSocketsMap.set(userId, userSockets);
    socket.join(userId);

    io.to(userId).emit('userConnected', { userCount: userSockets.size, latestUser: data.user });
}

function handleUserDisconnected(socket) {
    const userId = findUserIdBySocketId(socket.id);
    if (userId) {
        const userSockets = userSocketsMap.get(userId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
            userSocketsMap.delete(userId);
        } else {
            userSocketsMap.set(userId, userSockets);
        }
        io.emit('userDisconnected', { userCount: userSockets.size, userId: userId });
    }
}

io.on('connection', (socket) => {
    console.log(`${socket.id} has connected`);

    socket.on('newMessageToServer', (message) => {
        const userId = findUserIdBySocketId(socket.id);
        if (userId) {
            io.emit('newMessageToClients', { text: message.message, userId: userId }); // Global broadcast
        }
    });

    socket.on('userConnected', (data) => handleUserConnected(socket, data));
    socket.on('disconnect', () => handleUserDisconnected(socket));
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

function findUserIdBySocketId(socketId) {
    for (const [userId, socketIds] of userSocketsMap.entries()) {
        if (socketIds.has(socketId)) {
            return userId;
        }
    }
    return null;
}

console.log('Socket.io server started');