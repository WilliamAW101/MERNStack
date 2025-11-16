module.exports = (socketIOServer) => {
    console.log('Socket Handler Started');
    socketIOServer.on('connection', (socket) => {
        console.log('User has been connected to notification server with ID: ', socket.id);

        // have user join a room using the userID
        socket.on('register', (userID) => {

            socket.join(`user-${userID}`);
            socket.userID = userID;

            console.log(`User ${userID} joined room: user-${userID}`);

            // sending confirmation to front-end
            socket.emit('registered', {
                success: true,
                message: 'User Connected to Notification'
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected: ', socket.id);
        })
    })
}