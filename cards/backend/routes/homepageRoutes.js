const express = require('express');
const router = express.Router();

// import functions
const connectToDatabase = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const {
    responseJSON
} = require('../utils/json.js')

router.get('/homePage', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const homepageCollection = db.collection('post');

        const { lastTimestamp } = req.query; // optional for front-end we will just grab 10 latest posts if not provided

        let query = {};
        if (lastTimestamp) {
          query.timestamp = { $lt: new Date(lastTimestamp) };
        }

        const posts = await homepageCollection.find(query).sort({ timestamp: -1 }).limit(10).toArray(); // fetch 10 latest posts before the lastTimestamp if provided

        const nextCursor =  posts.length ? posts[posts.length - 1].timestamp : null // provide front-end with next cursor if there are more posts to fetch

        const refreshedToken = req.user.token; // get refreshed token from middleware
        
        responseJSON(res, true, { posts, nextCursor, refreshedToken}, 'homePage endpoint success', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'homePage endpoint failed ' + error, 500);
    }
});

module.exports = router;
