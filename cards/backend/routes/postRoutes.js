const express = require('express');
const router = express.Router();

// import functions
const connectToDatabase = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');
const { responseJSON } = require('../utils/json.js');

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
    };

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
        const postCollection = db.collection('post');
        const commentCollection = db.collection('comment');

        // Check if post exists
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        const post = await postCollection.findOne({ _id: postObjectId });
        if (!post) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
        }

        const timestamp = new Date();

        // Create comment document
        const newComment = {
            postId: postObjectId,
            userId,
            userName,
            commentText: commentText.trim(),
            timestamp
        };

        // Insert comment into comments collection
        const result = await commentCollection.insertOne(newComment);

        // Increment comment count on post
        await postCollection.updateOne(
            { _id: postObjectId },
            { $inc: { commentCount: 1 } }
        );

        const data = {
            commentId: result.insertedId,
            timestamp
        };

        return responseJSON(res, true, data, 'Comment added successfully!', 201);
    } catch (e) {
        console.error('Add comment error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to add comment', 500);
    }
});

router.get('/getComments', authenticateToken, async (req, res) => {
    // Payload receiving: postId, limit (optional), skip (optional)
    // Payload sending: success, data: { comments: [], total }, message
    try {
        const { postId, limit = 20, skip = 0 } = req.query;

        // Validate required fields
        if (!postId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }

        const db = await connectToDatabase();
        const commentCollection = db.collection('comment');

        // Validate postId format
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        // Fetch comments for the post with pagination
        const comments = await commentCollection
            .find({ postId: postObjectId })
            .sort({ timestamp: -1 }) // Most recent first
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .toArray();

        // Get total count of comments for this post
        const total = await commentCollection.countDocuments({ postId: postObjectId });

        const data = {
            comments,
            total
        };

        return responseJSON(res, true, data, 'Comments retrieved successfully!', 200);
    } catch (e) {
        console.error('Get comments error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to retrieve comments', 500);
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
