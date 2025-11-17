const { ObjectId } = require('mongodb');
const {
    grabURL
} = require('../utils/aws.js')

const grabPosts = async (res, req, posts, db) => {
    // optimized code for faster query, this is wack
    if (!posts || posts.length === 0) return posts;
    
    const postIds = posts.map(post => post._id);
    const currentUserId = new ObjectId(req.user.id);
    
    // ONE mega aggregation to get everything
    const enrichedPosts = await db.collection('post').aggregate([
        { $match: { _id: { $in: postIds } } },
        
        // Lookup user info
        {
            $lookup: {
                from: 'user',
                localField: 'userId',
                foreignField: '_id',
                as: 'userInfo'
            }
        },
        { $unwind: { path: '$userInfo', preserveNullAndEmptyArrays: true } },
        
        // Lookup comments
        {
            $lookup: {
                from: 'comment',
                let: { postId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$postId', '$$postId'] } } },
                    { $sort: { timestamp: -1 } },
                    { $limit: 20 }
                ],
                as: 'comments'
            }
        },
        
        // Lookup likes
        {
            $lookup: {
                from: 'likes',
                let: { postId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ['$post_id', '$$postId'] },
                                    { $eq: ['$user_id', currentUserId] }
                                ]
                            }
                        }
                    }
                ],
                as: 'userLike'
            }
        },
        
        // Add computed fields
        {
            $addFields: {
                username: '$userInfo.userName',
                isLiked: { $gt: [{ $size: '$userLike' }, 0] }
            }
        },
        
        // Project only needed fields
        {
            $project: {
                _id: 1,
                userId: 1,
                username: 1,
                content: 1,
                images: 1,
                timestamp: 1,
                likes: 1,
                comments: 1,
                isLiked: 1,
                userInfo: {
                    profilePicture: 1
                }
            }
        }
    ]).toArray();
    
    // Now just handle AWS URLs in parallel
    await Promise.all(
        enrichedPosts.map(async post => {
            // Get post images
            const imageURLs = [];
            if (Array.isArray(post.images) && post.images.length > 0) {
                const urls = await Promise.all(
                    post.images.map(img => img.key ? grabURL(img.key) : null)
                );
                imageURLs.push(...urls.filter(url => url !== null));
            }
            post.imageURLs = imageURLs;
            
            // Get profile picture
            if (post.userInfo?.profilePicture?.key) {
                post.userProfilePic = await grabURL(post.userInfo.profilePicture.key);
            } else {
                post.userProfilePic = null;
            }
            
            // Get comment images
            post.comments = await getCommentImageURL(post.comments, db.collection('user'));
            
            // Clean up
            delete post.userInfo;
        })
    );
    
    return enrichedPosts;
};

const getCommentImageURL = async (comments, userCollection) => {
    for (let comment of comments) {
        const user = await userCollection.findOne({ userName: comment.userName });
        let profileImageURL = null;
        if (user.profilePicture && user.profilePicture.key)
            profileImageURL = await grabURL(user.profilePicture.key);
        else
            profileImageURL = null;
        comment.userProfilePic = profileImageURL;
    }

    return comments;
}

module.exports = { grabPosts, getCommentImageURL };