const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');

// import functions
const { connectToDatabase } = require('../config/database.js');
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

router.put('/updatePost', authenticateToken, async (req, res) => {
    // Payload receiving: postId, caption (optional), images (optional), difficulty (optional), rating (optional), location (optional)
    // Payload sending: success, data: { post }, message
    try {
        const { postId, caption, images, difficulty, rating, location } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;

        // Validate required fields
        if (!postId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }

        const db = await connectToDatabase();
        const collection = db.collection('post');

        // Validate postId format
        let postObjectId;
        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        // Check if post exists and user owns it
        const post = await collection.findOne({ _id: postObjectId });
        if (!post) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
        }

        if (post.userId !== userId) {
            return responseJSON(res, false, { code: 'Forbidden' }, 'You do not have permission to update this post', 403);
        }

        // Build update object with only provided fields
        const updateFields = {};

        if (caption !== undefined) {
            if (typeof caption !== 'string' || caption.trim() === '') {
                return responseJSON(res, false, { code: 'Bad Request' }, 'Caption must be a non-empty string', 400);
            }
            updateFields.caption = caption.trim();
        }

        if (images !== undefined) {
            // Sanitize images: keep only valid S3 keys and type (image|video)
            const safeImages = Array.isArray(images)
                ? images
                    .filter(m => m && typeof m.key === 'string' && m.key.trim().length > 0)
                    .map(m => ({
                        provider: 's3',
                        key: m.key,
                        type: m.type === 'video' ? 'video' : 'image'
                    }))
                : null;
            updateFields.images = safeImages;
        }

        if (difficulty !== undefined) {
            if (typeof difficulty !== 'number' || difficulty < 0) {
                return responseJSON(res, false, { code: 'Bad Request' }, 'Difficulty must be a non-negative number', 400);
            }
            updateFields.difficulty = difficulty;
        }

        if (rating !== undefined) {
            if (typeof rating !== 'number' || rating < 0) {
                return responseJSON(res, false, { code: 'Bad Request' }, 'Rating must be a non-negative number', 400);
            }
            updateFields.rating = rating;
        }

        if (location !== undefined) {
            updateFields.location = location || null;
        }

        // Check if there are any fields to update
        if (Object.keys(updateFields).length === 0) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'No fields to update', 400);
        }

        // Add updatedAt timestamp
        updateFields.updatedAt = new Date();

        // Update the post
        const result = await collection.findOneAndUpdate(
            { _id: postObjectId },
            { $set: updateFields },
            { returnDocument: 'after' }
        );

        const data = {
            post: result
        };

        return responseJSON(res, true, data, 'Post updated successfully!', 200);
    } catch (e) {
        console.error('Update post error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to update post', 500);
    }
});

router.delete('/deletePost', authenticateToken, async (req, res) => {
    // Payload receiving: postId
    // Payload sending: success, data: { deletedCount }, message
    try {
        const { postId } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;

        // Validate required fields
        if (!postId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }

        const db = await connectToDatabase();
        const postCollection = db.collection('post');
        const commentCollection = db.collection('comment');
        const likesCollection = db.collection('likes');

        // Validate postId format
        let postObjectId;
        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        // Check if post exists and user owns it
        const post = await postCollection.findOne({ _id: postObjectId });
        if (!post) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
        }

        if (post.userId !== userId) {
            return responseJSON(res, false, { code: 'Forbidden' }, 'You do not have permission to delete this post', 403);
        }

        // Delete the post
        const deleteResult = await postCollection.deleteOne({ _id: postObjectId });

        // Delete all comments associated with this post
        await commentCollection.deleteMany({ postId: postObjectId });

        // Delete all likes associated with this post
        await likesCollection.deleteMany({ post_id: postObjectId });

        const data = {
            deletedCount: deleteResult.deletedCount,
            postId: postId
        };

        return responseJSON(res, true, data, 'Post deleted successfully!', 200);
    } catch (e) {
        console.error('Delete post error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to delete post', 500);
    }
});

router.get('/getPost', authenticateToken, async (req, res) => {
    // Payload receiving: postId (query param)
    // Payload sending: success, data: { post, comments, likes }, message
    try {
        const { postId } = req.query;

        // Validate required fields
        if (!postId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }

        const db = await connectToDatabase();
        const postCollection = db.collection('post');
        const commentCollection = db.collection('comment');
        const likesCollection = db.collection('likes');

        // Validate postId format
        let postObjectId;
        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        // Fetch the post
        const post = await postCollection.findOne({ _id: postObjectId });
        if (!post) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
        }

        // Fetch comments for the post
        const comments = await commentCollection
            .find({ postId: postObjectId })
            .sort({ timestamp: -1 })
            .toArray();

        // Fetch likes for the post
        const likes = await likesCollection
            .find({ post_id: postObjectId })
            .toArray();

        const data = {
            post,
            comments,
            likes,
            commentCount: comments.length,
            likeCount: likes.length
        };

        return responseJSON(res, true, data, 'Post retrieved successfully!', 200);
    } catch (e) {
        console.error('Get post error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to retrieve post', 500);
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

router.post('/likePost', authenticateToken, async (req, res) => {
    // Payload receiving: postId
    // Payload sending: success, data: { likeCount, isLiked }, message
    try {
        const { postId } = req.body;

        // Get userId from authenticated token
        const userId = req.user.id;

        // Validate required fields
        if (!postId) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Post ID is required', 400);
        }

        const db = await connectToDatabase();
        const postCollection = db.collection('post');

        // Validate postId format
        let postObjectId;
        try {
            postObjectId = new ObjectId(postId);
        } catch (e) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid post ID format', 400);
        }

        // Check if post exists
        const post = await postCollection.findOne({ _id: postObjectId });
        if (!post) {
            return responseJSON(res, false, { code: 'Not Found' }, 'Post not found', 404);
        }

        // Initialize likes array if it doesn't exist
        if (!post.likes) {
            post.likes = [];
        }

        let isLiked;
        let message;

        // Check if user already liked the post
        const userLikedIndex = post.likes.indexOf(userId);

        if (userLikedIndex !== -1) {
            // User already liked - UNLIKE (remove from array)
            await postCollection.updateOne(
                { _id: postObjectId },
                {
                    $pull: { likes: userId },
                    $inc: { likeCount: -1 }
                }
            );

            isLiked = false;
            message = 'Post unliked successfully!';
        } else {
            // User hasn't liked - ADD LIKE (add to array)
            await postCollection.updateOne(
                { _id: postObjectId },
                {
                    $push: { likes: userId },
                    $inc: { likeCount: 1 }
                }
            );

            isLiked = true;
            message = 'Post liked successfully!';
        }

        // Get updated like count
        const updatedPost = await postCollection.findOne({ _id: postObjectId });
        const likeCount = updatedPost.likeCount || 0;

        const data = {
            likeCount: likeCount,
            isLiked: isLiked
        };

        return responseJSON(res, true, data, message, 200);
    } catch (e) {
        console.error('Like post error:', e);
        return responseJSON(res, false, { code: 'Internal server error' }, 'Failed to like/unlike post', 500);
    }
});

module.exports = router;
