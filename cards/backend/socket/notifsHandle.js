module.exports = (socketIOServer) => {
    socketIOServer.on('connection', (socket) => {
        console.log('User has been connected to notification server with ID: ', socket.id);

        // have user join a room using the userID
        socket.on('register', (userID) => {

            socket.join(`user-${userID}`);
            console.log(`User ${userID} joined room: user-${userID}`);
        });

        socket.on('dissconnect', () => {
            console.log('User disconnected: ', socket.id);
        })
    })
}