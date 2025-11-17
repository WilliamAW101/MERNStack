// Cleaned this crap up

const app = require('./app');
const { Server } = require('socket.io');
const http = require('http');
const PORT = process.env.PORT || 5000;

// this socket crap needs to use http.createServer
const serverHost = http.createServer(app);

const socketIOServer = new Server(serverHost, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000", // We should use localhost since we reverse proxy
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        credentials: true
    }
});

require('./config/socket')(socketIOServer);
app.set('socketio', socketIOServer);

require('./socket/notifsHandle')(socketIOServer);

serverHost.listen(PORT, () => {
    console.log(`Starting new and improved server on ${PORT} :D`);
})

module.exports = { app, serverHost, socketIOServer };
