const express = require('express');
const router = express.Router();

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

router.get('/personalPosts', authenticateToken, async (req, res) => {
    try {
        
        const db = await connectToDatabase();
        const postCollection = db.collection('post');

        const { lastTimestamp } = req.query;
        let query = {
            timestamp: { $lt: new Date() }, // current time
            userId: req.user.id
        };
        if (lastTimestamp && !isNaN(Date.parse(lastTimestamp))) {
            query.timestamp = { $lt: new Date(lastTimestamp) };
        }

        let posts = await postCollection.find(query).sort({ timestamp: -1 }).limit(6).toArray(); // fetch 10 latest posts before the lastTimestamp if provided
        const nextCursor =  posts.length ? posts[posts.length - 1].timestamp : null // provide front-end with next cursor if there are more posts to fetch

        // we want to have frontend be given the first 3 comments for each post so they can display them for preview
        posts = await grabPosts(res, posts, db);
        if (posts == null)
            return;
        
        const refreshedToken = refreshToken(req.user.token); // get refreshed token from middleware
        
        responseJSON(res, true, { posts, nextCursor, refreshedToken}, 'profile endpoint success', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'personalPosts endpoint failed ' + error, 500);
    }
});


module.exports = router;