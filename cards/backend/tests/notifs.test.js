const { sendNotification } = require('../utils/notifs');

describe('utils/notifs.sendNotification', () => {
    const buildDbMock = () => {
        const insertOne = jest.fn().mockResolvedValue({ insertedId: 'notif-id' });
        const collection = jest.fn().mockReturnValue({ insertOne });
        return { db: { collection }, insertOne };
    };

    it('emits a global notification and saves it', async () => {
        const sockets = []; // value doesn't affect global branch behavior

        const inFetchSockets = jest.fn().mockResolvedValue(sockets);
        const fetchSockets = jest.fn().mockResolvedValue(sockets);
        const emit = jest.fn();

        const notif = {
            in: jest.fn(() => ({ fetchSockets: inFetchSockets })),
            fetchSockets,
            emit,
            to: jest.fn(), // not used in global path
        };

        const { db, insertOne } = buildDbMock();

        const notificationData = { type: 'Announcement', message: 'Global notice' };
        const sendTo = 'some-user-id';

        await sendNotification(notif, notificationData, db, sendTo, true);

        expect(notif.in).toHaveBeenCalledWith(`user-${sendTo}`);
        expect(inFetchSockets).toHaveBeenCalled();

        expect(emit).toHaveBeenCalledWith('notification', {
            type: 'Announcement',
            message: 'Global notice',
        });

        expect(notificationData.isGlobal).toBe(true);
        expect(notificationData.sendTo).toBe(sendTo);
        expect(notificationData.isSeen).toBe(false);
        expect(notificationData.isRead).toBe(false);

        expect(db.collection).toHaveBeenCalledWith('notifications');
        expect(insertOne).toHaveBeenCalledWith(notificationData);
    });

    it('emits a real-time notification when the user has active sockets', async () => {
        const sockets = [
            {
                id: 'socket-1',
                rooms: new Set(['user-123']),
                userID: '123',
            },
        ];

        const inFetchSockets = jest.fn().mockResolvedValue(sockets);
        const fetchSockets = jest.fn().mockResolvedValue(sockets);
        const emitGlobal = jest.fn();
        const emitToRoom = jest.fn();

        const notif = {
            in: jest.fn(() => ({ fetchSockets: inFetchSockets })),
            fetchSockets,
            emit: emitGlobal,
            to: jest.fn(() => ({ emit: emitToRoom })),
        };

        const { db, insertOne } = buildDbMock();

        const notificationData = { type: 'Comment', message: 'User commented' };
        const sendTo = '123';

        await sendNotification(notif, notificationData, db, sendTo, false);

        expect(notif.in).toHaveBeenCalledWith(`user-${sendTo}`);
        expect(inFetchSockets).toHaveBeenCalled();

        expect(notif.to).toHaveBeenCalledWith(`user-${sendTo}`);
        expect(emitToRoom).toHaveBeenCalledWith('notification', {
            type: 'Comment',
            message: 'User commented',
        });
        expect(emitGlobal).not.toHaveBeenCalled();

        expect(notificationData.isGlobal).toBe(false);
        expect(notificationData.sendTo).toBe(sendTo);
        expect(notificationData.isSeen).toBe(false);
        expect(notificationData.isRead).toBe(false);

        expect(db.collection).toHaveBeenCalledWith('notifications');
        expect(insertOne).toHaveBeenCalledWith(notificationData);
    });

    it('does not emit in real time when user has no sockets but still saves notification', async () => {
        const sockets = [];
        const allSockets = [];

        const inFetchSockets = jest.fn().mockResolvedValue(sockets);
        const fetchSockets = jest.fn().mockResolvedValue(allSockets);
        const emitGlobal = jest.fn();
        const to = jest.fn(() => ({ emit: jest.fn() }));

        const notif = {
            in: jest.fn(() => ({ fetchSockets: inFetchSockets })),
            fetchSockets,
            emit: emitGlobal,
            to,
        };

        const { db, insertOne } = buildDbMock();

        const notificationData = { type: 'Like', message: 'User liked your post' };
        const sendTo = '456';

        await sendNotification(notif, notificationData, db, sendTo, false);

        expect(notif.in).toHaveBeenCalledWith(`user-${sendTo}`);
        expect(inFetchSockets).toHaveBeenCalled();
        expect(fetchSockets).toHaveBeenCalled();

        expect(to).not.toHaveBeenCalled();
        expect(emitGlobal).not.toHaveBeenCalled();

        expect(notificationData.isGlobal).toBe(false);
        expect(notificationData.sendTo).toBe(sendTo);
        expect(notificationData.isSeen).toBe(false);
        expect(notificationData.isRead).toBe(false);

        expect(db.collection).toHaveBeenCalledWith('notifications');
        expect(insertOne).toHaveBeenCalledWith(notificationData);
    });
});
