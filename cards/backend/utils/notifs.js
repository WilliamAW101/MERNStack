const saveNotification = async (notificationData, db, sendTo, global) => {
    const notificationCollection = db.collection('notifications');
    if (global) {
        notificationData.isGlobal = global;
        notificationData.sendTo = sendTo;
    } else {
        notificationData.isGlobal = global;
        notificationData.sendTo = sendTo;
    }
    notificationData.read = false;
    const notifResult = await notificationCollection.insertOne(notificationData);
}

const sendNotification = async (notif, notificationData, db, sendTo, global) => {

    const room = `user-${sendTo}`;
    const sockets = await notif.in(room).fetchSockets();

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