const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

const { connectToDatabase } = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');
const { responseJSON } = require('../utils/json.js');
const { refreshToken } = require('../utils/authentication.js');


router.get('/notifications', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20, skip = 0 } = req.query;

        const db = await connectToDatabase();
        const notificationCollection = db.collection('notifications');

        // Fetch notifications for this user (non-global) or global notifications
        const notifications = await notificationCollection
            .find({
                $or: [
                    { sendTo: userId, isGlobal: false },
                    { isGlobal: true }
                ]
            })
            .sort({ 'data.timestamp': -1 }) // Most recent first
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .toArray();

        const data = {
            notifications,
            count: notifications.length
        };

        return responseJSON(res, true, data, 'Notifications retrieved successfully', 200);
    } catch (e) {
        console.error('Get notifications error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to retrieve notifications', 500);
    }
});


router.get('/notifications/unseen-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const db = await connectToDatabase();
        const notificationCollection = db.collection('notifications');

        // Count unseen notifications
        const unseenCount = await notificationCollection.countDocuments({
            $or: [
                { sendTo: userId, isGlobal: false, isSeen: { $ne: true } },
                { isGlobal: true, isSeen: { $ne: true } }
            ]
        });

        const data = {
            unseenCount
        };

        return responseJSON(res, true, data, 'Unseen count retrieved successfully', 200);
    } catch (e) {
        console.error('Get unseen count error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to retrieve unseen count', 500);
    }
});


router.post('/notifications/mark-all-seen', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;

        const db = await connectToDatabase();
        const notificationCollection = db.collection('notifications');

        // Mark all user's notifications as seen
        const result = await notificationCollection.updateMany(
            {
                $or: [
                    { sendTo: userId, isGlobal: false, isSeen: { $ne: true } },
                    { isGlobal: true, isSeen: { $ne: true } }
                ]
            },
            {
                $set: {
                    isSeen: true,
                    seenAt: new Date()
                }
            }
        );

        const data = {
            modifiedCount: result.modifiedCount
        };

        const refreshedToken = refreshToken(req.user.token);

        return responseJSON(res, true, { data, refreshedToken }, 'All notifications marked as seen', 200);
    } catch (e) {
        console.error('Mark all seen error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to mark notifications as seen', 500);
    }
});

/**
 * POST /notifications/mark-read
 * Mark individual notification as read when user clicks on it
 * This doesn't affect the badge count
 */
router.post('/notifications/mark-read', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { notificationId } = req.body;

        if (!notificationId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Notification ID is required', 400);
        }

        const db = await connectToDatabase();
        const notificationCollection = db.collection('notifications');

        let notificationObjectId;
        try {
            notificationObjectId = new ObjectId(notificationId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid notification ID format', 400);
        }

        // Verify the notification belongs to this user or is global
        const notification = await notificationCollection.findOne({
            _id: notificationObjectId,
            $or: [
                { sendTo: userId, isGlobal: false },
                { isGlobal: true }
            ]
        });

        if (!notification) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Notification not found', 404);
        }

        // Mark as read
        await notificationCollection.updateOne(
            { _id: notificationObjectId },
            {
                $set: {
                    isRead: true,
                    readAt: new Date()
                }
            }
        );

        const refreshedToken = refreshToken(req.user.token);

        return responseJSON(res, true, { refreshedToken }, 'Notification marked as read', 200);
    } catch (e) {
        console.error('Mark read error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to mark notification as read', 500);
    }
});

module.exports = router;

