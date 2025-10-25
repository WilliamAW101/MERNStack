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
            timestamp
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

module.exports = router;
