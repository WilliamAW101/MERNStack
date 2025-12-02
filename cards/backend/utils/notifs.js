const saveNotification = async (notificationData, db, sendTo, global) => {
    const notificationCollection = db.collection('notifications');
    if (global) {
        notificationData.isGlobal = global;
        notificationData.sendTo = sendTo;
    } else {
        notificationData.isGlobal = global;
        notificationData.sendTo = sendTo;
    }
    // Two separate states for notifications (Facebook-style)
    notificationData.isSeen = false;  // Controls badge count (unread bell icon)
    notificationData.isRead = false;   // Individual notification read status (bold vs normal)
    const notifResult = await notificationCollection.insertOne(notificationData);
}

const sendNotification = async (notif, notificationData, db, sendTo, global) => {

    const room = `user-${sendTo}`;
    console.log('=== NOTIFICATION DEBUG ===');
    console.log('sendTo value:', sendTo);
    console.log('sendTo type:', typeof sendTo);
    console.log('Looking for room:', room);

    const sockets = await notif.in(room).fetchSockets();
    console.log('Found sockets count:', sockets.length);

    // Debug: Show what rooms each socket is actually in
    if (sockets.length > 0) {
        sockets.forEach((socket, index) => {
            console.log(`Socket ${index + 1}:`, {
                socketId: socket.id,
                rooms: Array.from(socket.rooms), // Convert Set to Array for easier reading
                userID: socket.userID // From your notifsHandle.js
            });
        });
    } else {
        console.log('No sockets found in room:', room);
        // Show ALL connected sockets to help debug
        const allSockets = await notif.fetchSockets();
        console.log('Total connected sockets:', allSockets.length);
        allSockets.forEach((socket, index) => {
            console.log(`Connected Socket ${index + 1}:`, {
                socketId: socket.id,
                rooms: Array.from(socket.rooms),
                userID: socket.userID
            });
        });
    }
    console.log('=========================');

    if (global) {
        notif.emit('notification', {
            ...notificationData
        });
        console.log('notif sent globally');
    } else if (sockets.length > 0) {
        // user online, send notif now
        notif.to(`user-${sendTo}`).emit('notification', {
            ...notificationData
        });
        console.log('notif sent in real time');
    } else {
        // notif.emit('notification', { // global testing
        //     ...notificationData
        // });
        console.log('notif saves in database for later sending');
    }

    await saveNotification(notificationData, db, sendTo, global)
}

module.exports = { sendNotification };