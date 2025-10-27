const express = require('express');
const router = express.Router();

// import functions
const connectToDatabase = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');

router.post('/addPost', authenticateToken, async (req, res) => {
  // Payload in: { caption, difficulty, rating, images?: [{ key, type }], location? }
  // Payload out: { postId, timestamp, error }
  try {
    const { caption, difficulty, rating, images, location } = req.body;

    // auth
    const userId = req.user.id;

    // basic validation
    if (!caption) return res.status(400).json({ error: 'Caption is required' });
    if (difficulty === undefined || difficulty === null)
      return res.status(400).json({ error: 'Difficulty is required' });
    if (rating === undefined || rating === null)
      return res.status(400).json({ error: 'Rating is required' });

    if (typeof difficulty !== 'number' || difficulty < 0)
      return res.status(400).json({ error: 'Difficulty must be a non-negative number' });
    if (typeof rating !== 'number' || rating < 0)
      return res.status(400).json({ error: 'Rating must be a non-negative number' });

    // sanitize images: keep only valid S3 keys and type (image|video)
    const safeImages = Array.isArray(images)
      ? images
          .filter(m => m && typeof m.key === 'string' && m.key.trim().length > 0)
          .map(m => ({
            provider: 's3',
            key: m.key,
            type: m.type === 'video' ? 'video' : 'image'
          }))
      : null;

    const db = await connectToDatabase();
    const collection = db.collection('post');

    const timestamp = new Date();

    const newPost = {
      userId,
      caption,
      difficulty,
      rating,
      images: safeImages,         // e.g., [{ provider:'s3', key:'posts/uid/uuid.jpg', type:'image' }]
      location: location || null,
      timestamp,
      likeCount: 0,
      likes: [],
      commentCount: 0,
      comments: []
    };

    const result = await collection.insertOne(newPost);

    res.status(201).json({
      postId: result.insertedId,
      timestamp,
      error: ''
    });
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