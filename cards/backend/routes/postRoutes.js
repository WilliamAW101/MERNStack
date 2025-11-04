const express = require('express');
const router = express.Router();

// import functions
const connectToDatabase = require('../config/database.js');
const { authenticateToken } = require('../middleware/authMiddleware.js');
<<<<<<< HEAD

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
=======
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
      comments: []
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
>>>>>>> 1f8629b (updating history and fixing it (#4))
});

router.post('/addComment', authenticateToken, async (req, res) => {
    // Payload receiving: postId, commentText
<<<<<<< HEAD
    // Payload sending: commentId, timestamp, error
=======
    // Payload sending: success, data: { commentId, timestamp }, message
>>>>>>> 1f8629b (updating history and fixing it (#4))
    try {
        const { postId, commentText } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;
        const userName = req.user.userName;

        // Validate required fields
        if (!postId) {
<<<<<<< HEAD
            return res.status(400).json({ error: 'Post ID is required' });
        }
        if (!commentText || commentText.trim() === '') {
            return res.status(400).json({ error: 'Comment text is required' });
=======
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }
        if (!commentText || commentText.trim() === '') {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Comment text is required', 400);
>>>>>>> 1f8629b (updating history and fixing it (#4))
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        // Check if post exists
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
<<<<<<< HEAD
            return res.status(400).json({ error: 'Invalid post ID format' });
=======
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
>>>>>>> 1f8629b (updating history and fixing it (#4))
        }

        const post = await collection.findOne({ _id: postObjectId });
        if (!post) {
<<<<<<< HEAD
            return res.status(404).json({ error: 'Post not found' });
=======
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
>>>>>>> 1f8629b (updating history and fixing it (#4))
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

<<<<<<< HEAD
        const ret = {
            commentId: newComment.commentId,
            timestamp,
            error: ''
        };

        res.status(201).json(ret);
    } catch (e) {
        console.error('Add comment error:', e);
        res.status(500).json({ error: 'Internal server error' });
=======
        const data = {
            commentId: newComment.commentId,
            timestamp
        };

        return responseJSON(res, true, data, 'Comment added successfully!', 201);
    } catch (e) {
        console.error('Add comment error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to add comment', 500);
>>>>>>> 1f8629b (updating history and fixing it (#4))
    }
});

router.post('/likePost', authenticateToken, async (req, res) => {
    // Payload receiving: postId
<<<<<<< HEAD
    // Payload sending: likeCount, error
=======
    // Payload sending: success, data: { likeCount }, message
>>>>>>> 1f8629b (updating history and fixing it (#4))
    try {
        const { postId } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;

        // Validate required fields
        if (!postId) {
<<<<<<< HEAD
            return res.status(400).json({ error: 'Post ID is required' });
=======
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
>>>>>>> 1f8629b (updating history and fixing it (#4))
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        // Check if post exists
        const { ObjectId } = require('mongodb');
        let postObjectId;

        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
<<<<<<< HEAD
            return res.status(400).json({ error: 'Invalid post ID format' });
=======
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
>>>>>>> 1f8629b (updating history and fixing it (#4))
        }

        const post = await collection.findOne({ _id: postObjectId });
        if (!post) {
<<<<<<< HEAD
            return res.status(404).json({ error: 'Post not found' });
=======
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
>>>>>>> 1f8629b (updating history and fixing it (#4))
        }

        // Check if user already liked the post
        if (post.likes && post.likes.includes(userId)) {
<<<<<<< HEAD
            return res.status(400).json({ error: 'You have already liked this post' });
=======
            return responseJSON(res, false, { code: 'Bad Request' }, 'You have already liked this post', 400);
>>>>>>> 1f8629b (updating history and fixing it (#4))
        }

        // Add user to likes array and increment like count
        const result = await collection.updateOne(
            { _id: postObjectId },
            {
                $push: { likes: userId },
                $inc: { likeCount: 1 }
            }
        );

<<<<<<< HEAD
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
=======
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
>>>>>>> 1f8629b (updating history and fixing it (#4))
