const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

const { 
    authenticateToken
} = require('../middleware/authMiddleware.js');
const {
    responseJSON
} = require('../utils/json.js');
const {
    connectToDatabase
} = require('../config/database.js');
const {
    grabPosts
} = require('../utils/posts.js');
const {
    refreshToken
} = require('../utils/authentication.js');
const {
    grabURL
} = require('../utils/aws.js');
const { auth } = require('googleapis/build/src/apis/abusiveexperiencereport/index.js');

router.get('/personalPosts', authenticateToken, async (req, res) => {
    try {
        
        // payload receiving
        const requiredFields = {
            userName,
            lastTimestamp,
        } = req.query;

        // check to see if everything is filled out
        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => value === undefined || value === null || value === '')
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return responseJSON(res, false, { code: 'Bad Request' }, `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`, 400);
        }

        const db = await connectToDatabase();
        const postCollection = db.collection('post');
        const userCollection = db.collection('user');

        const user = await userCollection.findOne({ userName });
        
        if (user == null) {
            return responseJSON(res, false, { code: 'Not Found' }, 'User not found', 404);
        }

        let query = {
            timestamp: { $lt: new Date() }, // current time
            userId: user._id
        };
        if (lastTimestamp && !isNaN(Date.parse(lastTimestamp))) {
            query.timestamp = { $lt: new Date(lastTimestamp) };
        }

        let posts = await postCollection.find(query).sort({ timestamp: -1 }).limit(6).toArray(); // fetch 10 latest posts before the lastTimestamp if provided
        const nextCursor =  posts.length ? posts[posts.length - 1].timestamp : null // provide front-end with next cursor if there are more posts to fetch

        // we want to have frontend be given the first 3 comments for each post so they can display them for preview
        posts = await grabPosts(res, req, posts, db);
        if (posts == null)
            return;
        
        const refreshedToken = refreshToken(req.user.token); // get refreshed token from middleware
        
        responseJSON(res, true, { posts, nextCursor, refreshedToken}, 'profile endpoint success', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'personalPosts endpoint failed ' + error, 500);
    }
});

router.get('/getProfileInfo', authenticateToken, async (req, res) => {
    try {
        const requiredFields = {
            userName
        } = req.query;

        // check to see if everything is filled out
        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => value === undefined || value === null || value === '')
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return responseJSON(res, false, { code: 'Bad Request' }, `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`, 400);
        }

        const db = await connectToDatabase();
        const userCollection = db.collection('user');
        const postCollection= db.collection('post');

        const userInfo = await userCollection.findOne({ userName: userName });
        if (!userInfo) {
            return responseJSON(res, false, { code: 'Not found' }, 'User not found', 404);
        }

        const numberOfTotalPosts = await postCollection.countDocuments({
            userId: userInfo._id.toString()
        });
        
        if (userInfo.profilePicture && userInfo.profilePicture.key)
            profileImageURL = await grabURL(userInfo.profilePicture.key);
        else
            profileImageURL = null;
        userInfo.userProfilePic = profileImageURL;

        const refreshedToken = refreshToken(req.user.token); // get refreshed token from middleware

        responseJSON(res, true, { userInfo, refreshedToken, numberOfTotalPosts}, 'getProfileInfo endpoint success', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'getProfileInfo endpoint failed ' + error, 500);
    }
});

router.post('/changeProfileInfo', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const userCollection = db.collection('user');

        const {
            userName,
            phone, 
            firstName, 
            lastName,
            profileDescription
        } = req.body;

        const userInfo = await userCollection.findOne({ userName: userName });
        if (!userInfo) {
            return responseJSON(res, false, { code: 'Not found' }, 'User not found', 404);
        }

        // we want to only update if changed
        const updateFields = {};
        if (phone != "") 
            updateFields.phone = phone;
        else
            updateFields.phone = userInfo.phone;

        if (firstName != "") 
            updateFields.firstName = firstName;
        else
            updateFields.firstName = userInfo.firstName;

        if (lastName != "") 
            updateFields.lastName = lastName;
        else
            updateFields.lastName = userInfo.lastName;

        if (profileDescription != "") 
            updateFields.profileDescription = profileDescription;
        else
            updateFields.profileDescription = userInfo.profileDescription;

        // Update the timestamp
        updateFields.updatedAt = new Date();

        updateFields.profilePicture = null;

        // Update the user
        const result = await userCollection.updateOne(
            { _id: new ObjectId(req.user.id) },
            { $set: updateFields }
        );

        const refreshedToken = refreshToken(req.user.token); // get refreshed token from middleware

        // Get updated user info
        const updatedUser = await userCollection.findOne({ userName: userName })

        responseJSON(res, true, { updatedUser, refreshedToken}, 'changeProfile endpoint success', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'changeProfile endpoint failed ' + error, 500);
    }
});

router.post('/uploadProfilePictureKey', authenticateToken, async (req, res) => {
    try {
        // we need the content type of image and extension
        const { 
            key
        } = req.body;

        // Verify key belongs to this user
        if (!key.startsWith(`posts/${req.user.id}/`)) {
            return responseJSON(res, false, { code: 'This key does not belong to the current user' }, 'Invalid key', 403);
        }

        const db = await connectToDatabase();
        const userCollection = db.collection('user');

        const user = await userCollection.updateOne(
            { _id: new ObjectId(req.user.id) },
            {
                $set: { 
                    profilePicture: {
                        provider: 's3',
                        key: key,
                        type: 'image'
                    },
                    updatedAt: new Date()
                }
            }
        );

        // Check if user was found and updated
        if (user.matchedCount === 0) {
            return responseJSON(res, false, { code: 'Not Found' }, 'User not found', 404);
        }

        const refreshedToken = refreshToken(req.user.token); // get refreshed token from middleware

        return responseJSON(res, true, { refreshedToken }, 'Upload URL generated and uploaded to database', 200);
        
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'uploadProfilePicture endpoint failed ' + error, 500);
    }
});

router.get('/grabNotifications', authenticateToken, async (req, res) => {
    try {
        const id = req.query.id || req.user.id;
        const { lastTimestamp } = req.query; // optional, grab 20 latest if not provided

        const db = await connectToDatabase();
        const notificationCollection = db.collection('notifications');

        const query = {
            sendTo: new ObjectId(id),
            isGlobal: false,
            read: false,
        };

        // If lastTimestamp provided, get notifications older than that
        if (lastTimestamp && !isNaN(Date.parse(lastTimestamp))) {
            query['data.timestamp'] = { $lt: new Date(lastTimestamp) };
        }

        // Default timestamp filter if none given
        if (!query['data.timestamp']) {
            query['data.timestamp'] = { $lt: new Date() };
        }

        // grab all notifications that are not read for the user
        const personalNotifications = await notificationCollection.find(query).sort({ 'data.timestamp': -1 }).limit(20).toArray();

        const nextCursor = personalNotifications.length ? personalNotifications[personalNotifications.length - 1].data.timestamp : null;

        return responseJSON(res, true, { personalNotifications, nextCursor }, 'Notifications grabbed', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'grabNotifications endpoint failed ' + error, 500);
    }
})

router.post('/markRead', authenticateToken, async (req, res) => {
    try {
        const { 
            notifID
        } = req.body

        const db = await connectToDatabase();
        const notificationCollection = db.collection('notifications');

        const result = await notificationCollection.updateOne(
            { _id: new ObjectId(notifID) },
            { $set: { read: true} }
        );

        if (result.modifiedCount === 0) {
            return responseJSON(res, false, {}, 'Notification not found or already read', 404);
        }


        return responseJSON(res, true, result, 'Notification marked as read', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'grabNotifications endpoint failed ' + error, 500);
    }
})


module.exports = router;