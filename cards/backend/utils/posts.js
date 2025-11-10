const { ObjectId } = require('mongodb');
const {
    grabURL
} = require('../utils/aws.js')

const grabPosts = async (res, posts, db) => {

    const commentsCollection = db.collection('comment');
    const userCollection = db.collection('user');
    
    // we want to have frontend be given the first 3 comments for each post so they can display them for preview
    for (let post of posts) {
        const newUserID = new ObjectId(post.userId); //don't care, it works
        const user = await userCollection.findOne({ _id: newUserID });
        post.userProfilePic = null; // TODO: will change once personal page is done
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
    }
    return posts;
}

module.exports = { grabPosts };