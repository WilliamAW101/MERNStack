const express = require('express');
const router = express.Router();

// import functions
const connectToDatabase = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

router.post('/addPost', authenticateToken, async (req, res) => {
    // Payload receiving: caption, difficulty, rating, images (nullable), location (nullable)
    // Payload sending: postId, timestamp, error
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
            return res.status(400).json({ error: 'Caption is required' });
        }
        if (difficulty === undefined || difficulty === null) {
            return res.status(400).json({ error: 'Difficulty is required' });
        }
        if (rating === undefined || rating === null) {
            return res.status(400).json({ error: 'Rating is required' });
        }

        // Validate difficulty and rating are numbers
        if (typeof difficulty !== 'number' || difficulty < 0) {
            return res.status(400).json({ error: 'Difficulty must be a non-negative number' });
        }
        if (typeof rating !== 'number' || rating < 0) {
            return res.status(400).json({ error: 'Rating must be a non-negative number' });
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

        const ret = {
            postId: result.insertedId,
            timestamp,
            error: ''
        };

        res.status(201).json(ret);
    } catch (e) {
        console.error('Add post error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/addComment', authenticateToken, async (req, res) => {
    // Payload receiving: postId, commentText
    // Payload sending: commentId, timestamp, error
    try {
        const { postId, commentText } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;
        const userName = req.user.userName;

        // Validate required fields
        if (!postId) {
            return res.status(400).json({ error: 'Post ID is required' });
        }
        if (!commentText || commentText.trim() === '') {
            return res.status(400).json({ error: 'Comment text is required' });
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        // Check if post exists
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid post ID format' });
        }

        const post = await collection.findOne({ _id: postObjectId });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
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

        const ret = {
            commentId: newComment.commentId,
            timestamp,
            error: ''
        };

        res.status(201).json(ret);
    } catch (e) {
        console.error('Add comment error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/likePost', authenticateToken, async (req, res) => {
    // Payload receiving: postId
    // Payload sending: likeCount, error
    try {
        const { postId } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;

        // Validate required fields
        if (!postId) {
            return res.status(400).json({ error: 'Post ID is required' });
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        // Check if post exists
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return res.status(400).json({ error: 'Invalid post ID format' });
        }

        const post = await collection.findOne({ _id: postObjectId });
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Check if user already liked the post
        if (post.likes && post.likes.includes(userId)) {
            return res.status(400).json({ error: 'You have already liked this post' });
        }

        // Add user to likes array and increment like count
        const result = await collection.updateOne(
            { _id: postObjectId },
            {
                $push: { likes: userId },
                $inc: { likeCount: 1 }
            }
        );

        const ret = {
            likeCount: post.likeCount + 1,
            error: ''
        };

        res.status(200).json(ret);
    } catch (e) {
        console.error('Like post error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
