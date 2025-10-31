const express = require('express');
const router = express.Router();

// import functions
const connectToDatabase = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');
const { responseJSON } = require('../utils/json.js');

router.post('/addPost', authenticateToken, async (req, res) => {
    // Payload receiving: caption, difficulty, rating, images (nullable), location (nullable)
    // Payload sending: success, data: { postId, timestamp }, message
    try {
        const {
            caption,
            difficulty,
            rating,
            images,
            location
        } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;
        if (!caption) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Caption is required', 400);
        }
        if (difficulty === undefined || difficulty === null) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Difficulty is required', 400);
        }
        if (rating === undefined || rating === null) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Rating is required', 400);
        }

        // Validate difficulty and rating are numbers
        if (typeof difficulty !== 'number' || difficulty < 0) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Difficulty must be a non-negative number', 400);
        }
        if (typeof rating !== 'number' || rating < 0) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Rating must be a non-negative number', 400);
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        const timestamp = new Date();

        const newPost = {
            userId,
            caption,
            difficulty,
            rating,
            images: images || null,
            location: location || null,
            timestamp,
            likeCount: 0,
            likes: [], // Array of userIds who liked the post
            commentCount: 0,
            comments: [] // Array of comment objects
        };

        // Insert new post into the database
        const result = await collection.insertOne(newPost);

        const data = {
            postId: result.insertedId,
            timestamp
        };

        return responseJSON(res, true, data, 'Post created successfully!', 201);
    } catch (e) {
        console.error('Add post error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to create post', 500);
    }
});

router.post('/addComment', authenticateToken, async (req, res) => {
    // Payload receiving: postId, commentText
    // Payload sending: success, data: { commentId, timestamp }, message
    try {
        const { postId, commentText } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;
        const userName = req.user.userName;

        // Validate required fields
        if (!postId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }
        if (!commentText || commentText.trim() === '') {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Comment text is required', 400);
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        // Check if post exists
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        const post = await collection.findOne({ _id: postObjectId });
        if (!post) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
        }

        const timestamp = new Date();

        // Create comment object
        const newComment = {
            commentId: new ObjectId(),
            userId,
            userName,
            commentText: commentText.trim(),
            timestamp
        };

        // Add comment to post and increment comment count
        await collection.updateOne(
            { _id: postObjectId },
            {
                $push: { comments: newComment },
                $inc: { commentCount: 1 }
            }
        );

        const data = {
            commentId: newComment.commentId,
            timestamp
        };

        return responseJSON(res, true, data, 'Comment added successfully!', 201);
    } catch (e) {
        console.error('Add comment error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to add comment', 500);
    }
});

router.post('/likePost', authenticateToken, async (req, res) => {
    // Payload receiving: postId
    // Payload sending: success, data: { likeCount }, message
    try {
        const { postId } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;

        // Validate required fields
        if (!postId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        // Check if post exists
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        const post = await collection.findOne({ _id: postObjectId });
        if (!post) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
        }

        // Check if user already liked the post
        if (post.likes && post.likes.includes(userId)) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'You have already liked this post', 400);
        }

        // Add user to likes array and increment like count
        const result = await collection.updateOne(
            { _id: postObjectId },
            {
                $push: { likes: userId },
                $inc: { likeCount: 1 }
            }
        );

        const data = {
            likeCount: post.likeCount + 1
        };

        return responseJSON(res, true, data, 'Post liked successfully!', 200);
    } catch (e) {
        console.error('Like post error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to like post', 500);
    }
});

module.exports = router;
