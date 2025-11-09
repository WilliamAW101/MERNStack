const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// import functions
const connectToDatabase = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

const {
    responseJSON
} = require('../utils/json.js')

const {
    grabURL
} = require('../utils/aws.js')

router.get('/homePage', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const homepageCollection = db.collection('post');
        const commentsCollection = db.collection('comment');
        const userCollection = db.collection('user');

        const { lastTimestamp } = req.query; // optional for front-end we will just grab 10 latest posts if not provided

        let query = {
            timestamp: { $lt: new Date() } // current time
        };
        if (lastTimestamp && !isNaN(Date.parse(lastTimestamp))) {
            query.timestamp = { $lt: new Date(lastTimestamp) };
        }

        const posts = await homepageCollection.find(query).sort({ timestamp: -1 }).limit(10).toArray(); // fetch 10 latest posts before the lastTimestamp if provided

        const nextCursor =  posts.length ? posts[posts.length - 1].timestamp : null // provide front-end with next cursor if there are more posts to fetch

        // we want to have frontend be given the first 3 comments for each post so they can display them for preview
        for (let post of posts) {
            const newUserID = new ObjectId(post.userId);
            const user = await userCollection.findOne({ _id: newUserID });
            post.userProfilePic = null;
            post.username = user.userName;
            const comments = await commentsCollection.find({ postId: post._id }).sort({ timestamp: -1 }).limit(3).toArray();
            post.comments = comments; // attach the first 3 comments to the post object
            
            
            // convert key to aws url
            post.imageURL = null;
            let imageKey = null;
            if (Array.isArray(post.images) && post.images.length > 0) {
                imageKey = post.images[0].key;
            }

            if (imageKey) {
                post.imageURL = await grabURL(imageKey);
                if (post.imageURL == null) {
                    responseJSON(res, false, { code: 'AWS error' }, 'Failed to grab image URL ' + error, 500);
                    return;
                }
            }
        }

        const refreshedToken = req.user.token; // get refreshed token from middleware
        
        responseJSON(res, true, { posts, nextCursor, refreshedToken}, 'homePage endpoint success', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'homePage endpoint failed ' + error, 500);
    }
});

router.get('/getComments', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const commentsCollection = db.collection('comment');
        const { postID, lastTimestamp } = req.query; // postID is required, lastTimestamp is optional
        if (!postID) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'postID is required', 400);
        }
        if (lastTimestamp && !isNaN(Date.parse(lastTimestamp))) {
            query.timestamp = { $lt: new Date(lastTimestamp) };
        }
        const newpostID = new ObjectId(postID);
        const comments = await commentsCollection.find({ postId: newpostID }).sort({ timestamp: -1 }).limit(10).toArray(); // fetch 10 latest comments before the lastTimestamp if provided

        const nextCursor =  comments.length ? comments[comments.length - 1].timestamp : null // provide front-end with next cursor if there are more comments to fetch

        const refreshedToken = req.user.token; // get refreshed token from middleware

        responseJSON(res, true, { comments, nextCursor, refreshedToken}, 'comments endpoint success', 200);
    }
    catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'comments endpoint failed ' + error, 500);
    }
});

router.get('/getLikes', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const likesCollection = db.collection('likes');
        const { postID, lastTimestamp } = req.query; // postID is required, lastTimestamp is optional
        if (!postID) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'postID is required', 400);
        }
        if (lastTimestamp && !isNaN(Date.parse(lastTimestamp))) {
            query.timestamp = { $lt: new Date(lastTimestamp) };
        }
        const newpostID = new ObjectId(postID);
        const likes = await likesCollection.find({ post_id: newpostID }).sort({ timestamp: -1 }).limit(20).toArray(); // fetch 20 latest likes before the lastTimestamp if provided

        const nextCursor =  likes.length ? likes[likes.length - 1].timestamp : null // provide front-end with next cursor if there are more comments to fetch

        const refreshedToken = req.user.token; // get refreshed token from middleware

        responseJSON(res, true, { likes, nextCursor, refreshedToken}, 'likes endpoint success', 200);
    }
    catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'likes endpoint failed ' + error, 500);
    }
});

module.exports = router;
