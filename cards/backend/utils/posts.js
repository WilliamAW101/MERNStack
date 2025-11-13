const { ObjectId } = require('mongodb');
const {
    grabURL
} = require('../utils/aws.js')

const grabPosts = async (res, req, posts, db) => {

    const commentsCollection = db.collection('comment');
    const userCollection = db.collection('user');
    const likeCollection = db.collection('likes');
    
    // we want to have frontend be given the first 3 comments for each post so they can display them for preview
    for (let post of posts) {
        const newUserID = new ObjectId(post.userId); //don't care, it works
        const user = await userCollection.findOne({ _id: newUserID });
        post.username = user.userName;
        const comments = await commentsCollection.find({ postId: post._id }).sort({ timestamp: -1 }).limit(3).toArray();
        post.comments = comments; // attach the first 3 comments to the post object
        
        
        // convert key to aws url
        post.imageURLs = null;
        const imageURLs = [];
        if (Array.isArray(post.images) && post.images.length > 0) {
            for (const image of post.images) {
                if (image.key) {
                    const imageURL = await grabURL(image.key);
                    if (imageURL == null) {
                        responseJSON(res, false, { code: 'AWS error' }, 'Failed to grab image URL ', 500);
                        return null;
                    }
                    imageURLs.push(imageURL);
                }
            }
        }
        post.imageURLs = imageURLs
        let profileImageURL = null;
        
        if (user.profilePicture && user.profilePicture.key)
            profileImageURL = await grabURL(user.profilePicture.key);
        else
            profileImageURL = null;
        post.userProfilePic = profileImageURL;
        
        // find out if user liked the post
        const userObjectId = new ObjectId(req.user.id);
        const isLiked = await likeCollection.findOne({ post_id: new ObjectId(post._id), user_id: userObjectId });
        if (isLiked) {
            post.isLiked = true;
        } else {
            post.isLiked = false;
        }
    }
    return posts;
}

module.exports = { grabPosts };