const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectToDatabase, closeDatabase } = require('../config/database');
const { hashPass, verifyPass } = require('../utils/authentication');

const mockGetSignedUrl = jest.fn().mockResolvedValue('https://example.com/signed');

jest.mock('@aws-sdk/client-s3', () => {
    const S3Client = jest.fn().mockImplementation(() => ({}));
    const PutObjectCommand = jest.fn().mockImplementation(input => input);
    const GetObjectCommand = jest.fn().mockImplementation(input => input);
    return { S3Client, PutObjectCommand, GetObjectCommand };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: (...args) => mockGetSignedUrl(...args)
}));

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'dummy';
process.env.EMAIL_USER = process.env.EMAIL_USER || 'test@example.com';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-2';
process.env.S3_BUCKET = process.env.S3_BUCKET || 'test-bucket';

let mongoServer;
let app;

// Start in-memory MongoDB server before all tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create(); // launches a temporary mongod just for tests
    process.env.DB_URL = mongoServer.getUri();
    process.env.DATABASE = process.env.DATABASE || 'test-db';

    app = require('../app');
});

// Close database connection and stop in-memory server after all tests
afterAll(async () => {
    if (typeof closeDatabase === 'function') {
        await closeDatabase();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

beforeEach(async () => {
    mockGetSignedUrl.mockReset();
    mockGetSignedUrl.mockResolvedValue('https://example.com/signed');

    const db = await connectToDatabase();
    await Promise.all([
        db.collection('user').deleteMany({}),
        db.collection('passwordVerify').deleteMany({}).catch(() => null),
        db.collection('post').deleteMany({}).catch(() => null),
        db.collection('comment').deleteMany({}).catch(() => null),
        db.collection('likes').deleteMany({}).catch(() => null),
    ]);
});

const createVerifiedUserWithToken = async (overrides = {}) => {
    const db = await connectToDatabase();
    const userDoc = {
        userName: 'poster',
        password: overrides.password || 'hashed-pass',
        email: 'poster@example.com',
        phone: '000-000-0000',
        firstName: 'Post',
        lastName: 'Er',
        verified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    };
    const { insertedId } = await db.collection('user').insertOne(userDoc);
    const token = jwt.sign(
        { id: insertedId.toString(), userName: userDoc.userName },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    return { token, userId: insertedId.toString(), userDoc };
};

const createUserWithPost = async (userOverrides = {}, postOverrides = {}) => {
    const base = await createVerifiedUserWithToken(userOverrides);
    const db = await connectToDatabase();

    const postDoc = {
        userId: base.userId, // stored as string for routes that compare directly
        caption: 'Test post',
        difficulty: 1,
        rating: 1,
        images: [],
        location: null,
        timestamp: new Date(),
        likeCount: 0,
        commentCount: 0,
        ...postOverrides,
    };

    const { insertedId } = await db.collection('post').insertOne(postDoc);

    return { ...base, postId: insertedId, postDoc };
};

describe('POST /api/signup', () => {
    it('creates a new user and returns success payload', async () => {
        const payload = {
            userName: 'janedoe',
            password: 'ValidPass123!',
            email: 'janedoe@example.com',
            phone: '123-456-7890',
            firstName: 'Jane',
            lastName: 'Doe'
        };

        const res = await request(app)
            .post('/api/signup')
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
            firstName: 'Jane',
            lastName: 'Doe'
        });

        const db = await connectToDatabase();
        const storedUser = await db.collection('user').findOne({ userName: 'janedoe' });
        expect(storedUser).not.toBeNull();
        expect(storedUser.password).not.toBe(payload.password);
        expect(storedUser.verified).toBe(false);
    });
});

describe('POST /api/login', () => {
    it('authenticates a verified user with valid credentials', async () => {
        const db = await connectToDatabase();
        const plainPassword = 'StrongPass987!';
        await db.collection('user').insertOne({
            userName: 'veronica',
            password: await hashPass(plainPassword),
            email: 'veronica@example.com',
            phone: '111-222-3333',
            firstName: 'Veronica',
            lastName: 'Mars',
            verified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        const res = await request(app)
            .post('/api/login')
            .send({ userName: 'veronica', password: plainPassword });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toMatchObject({
            firstName: 'Veronica',
            lastName: 'Mars'
        });
        expect(res.body.data.token).toBeTruthy();
    });

    it('rejects login when credentials are invalid', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ userName: 'ghost', password: 'wrong' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid username or password/i);
    });
});

describe('GET /api/sendCode', () => {
    it('creates a password reset code for an existing user email', async () => {
        const db = await connectToDatabase();
        const email = 'reset@example.com';

        const { insertedId } = await db.collection('user').insertOne({
            userName: 'resetUser',
            password: await hashPass('OldPass123!'),
            email,
            phone: '000-000-0000',
            firstName: 'Reset',
            lastName: 'User',
            verified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
            .get('/api/sendCode')
            .query({ email: 'Reset@Example.com' }); // verifies normalization

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.id).toBeTruthy();

        const storedCode = await db.collection('passwordVerify').findOne({ id: insertedId });
        expect(storedCode).not.toBeNull();
        expect(storedCode.code).toHaveLength(6);
    });
});

describe('POST /api/changePassword', () => {
    it('changes the password when a valid reset code is provided', async () => {
        const db = await connectToDatabase();

        const { insertedId } = await db.collection('user').insertOne({
            userName: 'changePasswordUser',
            password: await hashPass('OldPassword1!'),
            email: 'changepass@example.com',
            phone: '000-000-0000',
            firstName: 'Change',
            lastName: 'Password',
            verified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const resetCode = '123456';
        await db.collection('passwordVerify').insertOne({
            code: resetCode,
            id: insertedId,
            createdAt: new Date(),
        });

        const res = await request(app)
            .post('/api/changePassword')
            .send({
                code: resetCode,
                newPassword: 'NewSecurePass2!',
                samePassword: 'NewSecurePass2!',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const updatedUser = await db.collection('user').findOne({ _id: insertedId });
        const matches = await verifyPass('NewSecurePass2!', updatedUser.password);
        expect(matches).toBe(true);
    });

    it('rejects mismatched new passwords', async () => {
        const res = await request(app)
            .post('/api/changePassword')
            .send({
                code: 'anycode',
                newPassword: 'one',
                samePassword: 'two',
            });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/passwords do not match/i);
    });
});

describe('GET /api/verifyEmail', () => {
    it('verifies a user email when a valid token is provided', async () => {
        const db = await connectToDatabase();
        const email = 'verify@example.com';

        await db.collection('user').insertOne({
            userName: 'verifyUser',
            password: await hashPass('Password1!'),
            email,
            phone: '000-000-0000',
            firstName: 'Verify',
            lastName: 'User',
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const res = await request(app)
            .get('/api/verifyEmail')
            .query({ token });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const verifiedUser = await db.collection('user').findOne({ email });
        expect(verifiedUser.verified).toBe(true);
    });
});

describe('GET /api/ping', () => {
    it('responds with a successful status when the server and database are reachable', async () => {
        const res = await request(app).get('/api/ping');

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/server connection successfull/i);
    });
});

describe('POST /api/uploads/url', () => {
    it('returns a presigned upload url when authenticated', async () => {
        const { token, userId } = await createVerifiedUserWithToken({ userName: 'uploader' });

        const res = await request(app)
            .post('/api/uploads/url')
            .set('Authorization', `Bearer ${token}`)
            .send({ contentType: 'image/jpeg', ext: 'jpg' });

        expect(res.status).toBe(200);
        expect(res.body.uploadUrl).toBe('https://example.com/signed');
        expect(res.body.key).toMatch(new RegExp(`^posts/${userId}/[\\w-]+\\.jpg$`));
        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('rejects requests without a bearer token', async () => {
        const res = await request(app)
            .post('/api/uploads/url')
            .send({ contentType: 'image/jpeg', ext: 'jpg' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access token required/i);
    });
});

describe('POST /api/downloads/url', () => {
    it('returns a presigned download url for an existing object key', async () => {
        mockGetSignedUrl.mockResolvedValueOnce('https://example.com/download');
        const { token } = await createVerifiedUserWithToken({ userName: 'downloader' });

        const res = await request(app)
            .post('/api/downloads/url')
            .set('Authorization', `Bearer ${token}`)
            .send({ key: 'posts/some-user/some-key.jpg' });

        expect(res.status).toBe(200);
        expect(res.body.url).toBe('https://example.com/download');
        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });
});

describe('GET /api/homePage', () => {
    it('returns an empty posts array for an authenticated user with no posts', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'homeUser' });

        const res = await request(app)
            .get('/api/homePage')
            .set('Authorization', `Bearer ${token}`)
            .query({});

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.posts)).toBe(true);
        expect(res.body.data.posts.length).toBe(0);
        expect(res.body.data.nextCursor).toBeNull();
        expect(res.body.data.refreshedToken).toBeTruthy();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request(app)
            .get('/api/homePage')
            .query({});

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access token required/i);
    });
});

describe('GET /api/getComments', () => {
    it('returns comments for a given post when authenticated', async () => {
        const { token, userId, userDoc } = await createVerifiedUserWithToken({ userName: 'commenter' });
        const db = await connectToDatabase();

        const postId = new ObjectId();
        await db.collection('post').insertOne({
            _id: postId,
            userId,
            caption: 'Post for comments',
            difficulty: 1,
            rating: 1,
            images: [],
            location: null,
            timestamp: new Date(),
            likeCount: 0,
            commentCount: 0,
        });

        await db.collection('comment').insertOne({
            postId,
            userId: new ObjectId(userId),
            userName: userDoc.userName,
            commentText: 'Nice post',
            timestamp: new Date(),
        });

        const res = await request(app)
            .get('/api/getComments')
            .set('Authorization', `Bearer ${token}`)
            .query({ postID: postId.toString() });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.comments)).toBe(true);
        expect(res.body.data.comments.length).toBe(1);
        expect(res.body.data.comments[0].commentText).toBe('Nice post');
        expect(res.body.data.refreshedToken).toBeTruthy();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request(app)
            .get('/api/getComments')
            .query({ postID: new ObjectId().toString() });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access token required/i);
    });
});

describe('GET /api/getLikes', () => {
    it('returns likes for a given post when authenticated', async () => {
        const { token, userId } = await createVerifiedUserWithToken({ userName: 'liker' });
        const db = await connectToDatabase();

        const postId = new ObjectId();
        await db.collection('post').insertOne({
            _id: postId,
            userId,
            caption: 'Post for likes',
            difficulty: 1,
            rating: 1,
            images: [],
            location: null,
            timestamp: new Date(),
            likeCount: 0,
            commentCount: 0,
        });

        await db.collection('likes').insertOne({
            post_id: postId,
            user_id: new ObjectId(userId),
            likedAt: new Date(),
        });

        const res = await request(app)
            .get('/api/getLikes')
            .set('Authorization', `Bearer ${token}`)
            .query({ postID: postId.toString() });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.likes)).toBe(true);
        expect(res.body.data.likes.length).toBe(1);
        expect(res.body.data.refreshedToken).toBeTruthy();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request(app)
            .get('/api/getLikes')
            .query({ postID: new ObjectId().toString() });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access token required/i);
    });
});

describe('GET /api/personalPosts', () => {
    it('returns personal posts for the requested user', async () => {
        const { token, userId, userDoc } = await createVerifiedUserWithToken({ userName: 'profileUser' });
        const db = await connectToDatabase();

        const now = new Date();
        await db.collection('post').insertOne({
            userId: userId, // stored as string to match route query
            caption: 'Profile post',
            difficulty: 2,
            rating: 3,
            images: [],
            location: null,
            timestamp: now,
            likeCount: 0,
            commentCount: 0,
        });

        // lastTimestamp is a cursor upper bound: route queries for posts with timestamp < lastTimestamp
        const future = new Date(now.getTime() + 1000);

        const res = await request(app)
            .get('/api/personalPosts')
            .set('Authorization', `Bearer ${token}`)
            .query({ userName: userDoc.userName, lastTimestamp: future.toISOString() });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.posts)).toBe(true);
        expect(res.body.data.posts.length).toBe(1);
        expect(res.body.data.posts[0].caption).toBe('Profile post');
        expect(res.body.data.refreshedToken).toBeTruthy();
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request(app)
            .get('/api/personalPosts')
            .query({ userName: 'someone', lastTimestamp: new Date().toISOString() });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access token required/i);
    });
});

describe('GET /api/getProfileInfo', () => {
    it('returns profile info and total posts for a user', async () => {
        const { token, userId, userDoc } = await createVerifiedUserWithToken({ userName: 'profileInfoUser' });
        const db = await connectToDatabase();

        await db.collection('post').insertMany([
            {
                userId: userId,
                caption: 'Post 1',
                difficulty: 1,
                rating: 2,
                images: [],
                location: null,
                timestamp: new Date(),
                likeCount: 0,
                commentCount: 0,
            },
            {
                userId: userId,
                caption: 'Post 2',
                difficulty: 2,
                rating: 3,
                images: [],
                location: null,
                timestamp: new Date(),
                likeCount: 0,
                commentCount: 0,
            },
        ]);

        const res = await request(app)
            .get('/api/getProfileInfo')
            .set('Authorization', `Bearer ${token}`)
            .query({ userName: userDoc.userName });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.userInfo.userName).toBe(userDoc.userName);
        expect(res.body.data.numberOfTotalPosts).toBe(2);
        expect(res.body.data.refreshedToken).toBeTruthy();
    });
});

describe('POST /api/changeProfileInfo', () => {
    it('updates profile fields for an authenticated user', async () => {
        const { token, userId, userDoc } = await createVerifiedUserWithToken({ userName: 'changeProfileUser' });
        const db = await connectToDatabase();

        const res = await request(app)
            .post('/api/changeProfileInfo')
            .set('Authorization', `Bearer ${token}`)
            .send({
                userName: userDoc.userName,
                phone: '999-999-9999',
                firstName: 'NewFirst',
                lastName: 'NewLast',
                profileDescription: 'New description',
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.updatedUser.phone).toBe('999-999-9999');
        expect(res.body.data.updatedUser.firstName).toBe('NewFirst');
        expect(res.body.data.updatedUser.lastName).toBe('NewLast');
        expect(res.body.data.updatedUser.profileDescription).toBe('New description');
        expect(res.body.data.refreshedToken).toBeTruthy();

        const updated = await db.collection('user').findOne({ _id: new ObjectId(userId) });
        expect(updated.phone).toBe('999-999-9999');
        expect(updated.firstName).toBe('NewFirst');
        expect(updated.lastName).toBe('NewLast');
        expect(updated.profileDescription).toBe('New description');
    });
});

describe('POST /api/uploadProfilePictureKey', () => {
    it('stores profile picture key for the authenticated user', async () => {
        const { token, userId } = await createVerifiedUserWithToken({ userName: 'avatarUser' });
        const db = await connectToDatabase();

        const key = `posts/${userId}/avatar.jpg`;

        const res = await request(app)
            .post('/api/uploadProfilePictureKey')
            .set('Authorization', `Bearer ${token}`)
            .send({ key });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.refreshedToken).toBeTruthy();

        const updated = await db.collection('user').findOne({ _id: new ObjectId(userId) });
        expect(updated.profilePicture).toMatchObject({
            provider: 's3',
            key,
            type: 'image',
        });
    });
});

describe('POST /api/addPost', () => {
    it('creates a post for an authenticated user', async () => {
        const { token, userId } = await createVerifiedUserWithToken({ userName: 'poster-user' });
        const payload = {
            caption: 'Great climb',
            difficulty: 4,
            rating: 5,
            images: [
                {
                    provider: 's3',
                    key: `posts/${userId}/photo.jpg`,
                    type: 'image'
                }
            ],
            location: { lat: 40.0, lon: -105.0 }
        };

        const res = await request(app)
            .post('/api/addPost')
            .set('Authorization', `Bearer ${token}`)
            .send(payload);

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toBeDefined();
        expect(res.body.data.postId).toBeTruthy();
        expect(res.body.data.timestamp).toBeTruthy();

        const createdId = res.body.data.postId?.$oid || res.body.data.postId;

        const db = await connectToDatabase();
        const storedPost = await db
            .collection('post')
            .findOne({ _id: new ObjectId(createdId) });

        expect(storedPost).not.toBeNull();
        expect(storedPost.caption).toBe(payload.caption);
        expect(storedPost.difficulty).toBe(payload.difficulty);
        expect(storedPost.rating).toBe(payload.rating);
        expect(storedPost.userId.toString()).toBe(userId);
        expect(storedPost.images[0]).toMatchObject({
            provider: 's3',
            key: `posts/${userId}/photo.jpg`,
            type: 'image'
        });
    });

    it('rejects unauthenticated requests', async () => {
        const res = await request(app)
            .post('/api/addPost')
            .send({ caption: 'Missing token', difficulty: 1, rating: 1 });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/access token required/i);
    });
});

describe('PUT /api/updatePost', () => {
    it('updates an existing post owned by the authenticated user', async () => {
        const { token, postId } = await createUserWithPost({ userName: 'updateUser' }, { caption: 'Old caption' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                postId: postId.toString(),
                caption: 'Updated caption',
                difficulty: 3,
                rating: 4,
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const db = await connectToDatabase();
        const updated = await db.collection('post').findOne({ _id: postId });
        expect(updated.caption).toBe('Updated caption');
        expect(updated.difficulty).toBe(3);
        expect(updated.rating).toBe(4);
    });
});

describe('DELETE /api/deletePost', () => {
    it('deletes an existing post and associated data', async () => {
        const { token, userId, postId } = await createUserWithPost({ userName: 'deleteUser' });
        const db = await connectToDatabase();

        // Seed a comment and like for the post
        await db.collection('comment').insertOne({
            postId,
            userId: new ObjectId(userId),
            userName: 'deleteUser',
            commentText: 'To be deleted',
            timestamp: new Date(),
        });
        await db.collection('likes').insertOne({
            post_id: postId,
            user_id: new ObjectId(userId),
            likedAt: new Date(),
        });

        const res = await request(app)
            .delete('/api/deletePost')
            .set('Authorization', `Bearer ${token}`)
            .send({ postId: postId.toString() });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.deletedCount).toBe(1);

        const deletedPost = await db.collection('post').findOne({ _id: postId });
        expect(deletedPost).toBeNull();
        const remainingComments = await db.collection('comment').find({ postId }).toArray();
        const remainingLikes = await db.collection('likes').find({ post_id: postId }).toArray();
        expect(remainingComments.length).toBe(0);
        expect(remainingLikes.length).toBe(0);
    });
});

describe('GET /api/getPost', () => {
    it('retrieves a post with comments, likes, and profile image', async () => {
        const { token, userId, userDoc, postId } = await createUserWithPost({ userName: 'detailUser' });
        const db = await connectToDatabase();

        // Add a profile picture to the user
        await db.collection('user').updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    profilePicture: {
                        provider: 's3',
                        key: `posts/${userId}/avatar.jpg`,
                        type: 'image',
                    },
                },
            }
        );

        await db.collection('comment').insertOne({
            postId,
            userId: new ObjectId(userId),
            userName: userDoc.userName,
            commentText: 'Great route',
            timestamp: new Date(),
        });

        await db.collection('likes').insertOne({
            post_id: postId,
            user_id: new ObjectId(userId),
            likedAt: new Date(),
        });

        const res = await request(app)
            .get('/api/getPost')
            .set('Authorization', `Bearer ${token}`)
            .query({ postId: postId.toString() });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.post.caption).toBe('Test post');
        expect(res.body.data.comments.length).toBe(1);
        expect(res.body.data.likes.length).toBe(1);
        expect(res.body.data.profileImageURL).toBe('https://example.com/signed');
    });
});

describe('POST /api/addComment', () => {
    it('adds a comment to an existing post', async () => {
        const { token, userId, userDoc, postId } = await createUserWithPost({ userName: 'commentUser' });
        const db = await connectToDatabase();

        const res = await request(app)
            .post('/api/addComment')
            .set('Authorization', `Bearer ${token}`)
            .send({
                postId: postId.toString(),
                commentText: 'Nice send!',
            });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data.data.commentId).toBeTruthy();
        expect(res.body.data.refreshedToken).toBeTruthy();

        const comment = await db.collection('comment').findOne({
            postId,
            userId: new ObjectId(userId),
            userName: userDoc.userName,
        });
        expect(comment).not.toBeNull();

        const post = await db.collection('post').findOne({ _id: postId });
        expect(post.commentCount).toBe(1);
    });
});

describe('DELETE /api/deleteComment', () => {
    it('deletes a comment and decrements comment count', async () => {
        const { token, userId, userDoc, postId } = await createUserWithPost({ userName: 'deleteCommentUser' }, { commentCount: 1 });
        const db = await connectToDatabase();

        const { insertedId: commentId } = await db.collection('comment').insertOne({
            postId,
            userId: new ObjectId(userId),
            userName: userDoc.userName,
            commentText: 'To be removed',
            timestamp: new Date(),
        });

        const res = await request(app)
            .delete('/api/deleteComment')
            .set('Authorization', `Bearer ${token}`)
            .send({ commentID: commentId.toString() });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const deletedComment = await db.collection('comment').findOne({ _id: commentId });
        expect(deletedComment).toBeNull();

        const post = await db.collection('post').findOne({ _id: postId });
        expect(post.commentCount).toBe(0);
    });
});

describe('POST /api/changeComment', () => {
    it('updates the text of an existing comment', async () => {
        const { token, userId, userDoc, postId } = await createUserWithPost({ userName: 'changeCommentUser' });
        const db = await connectToDatabase();

        const { insertedId: commentId } = await db.collection('comment').insertOne({
            postId,
            userId: new ObjectId(userId),
            userName: userDoc.userName,
            commentText: 'Old text',
            timestamp: new Date(),
        });

        const res = await request(app)
            .post('/api/changeComment')
            .set('Authorization', `Bearer ${token}`)
            .send({ commentID: commentId.toString(), text: 'New text' });

        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);

        const updatedComment = await db.collection('comment').findOne({ _id: commentId });
        expect(updatedComment.commentText).toBe('New text');
    });
});

describe('POST /api/likePost', () => {
    it('toggles like status for a post', async () => {
        const { token, userId, postId } = await createUserWithPost({ userName: 'likeUser' });
        const db = await connectToDatabase();

        // First call: like the post
        const resLike = await request(app)
            .post('/api/likePost')
            .set('Authorization', `Bearer ${token}`)
            .send({ postId: postId.toString() });

        expect(resLike.status).toBe(200);
        expect(resLike.body.success).toBe(true);
        expect(resLike.body.data.data.isLiked).toBe(true);
        expect(resLike.body.data.data.likeCount).toBe(1);

        let likes = await db.collection('likes').find({ post_id: postId, user_id: new ObjectId(userId) }).toArray();
        expect(likes.length).toBe(1);

        // Second call: unlike the post
        const resUnlike = await request(app)
            .post('/api/likePost')
            .set('Authorization', `Bearer ${token}`)
            .send({ postId: postId.toString() });

        expect(resUnlike.status).toBe(200);
        expect(resUnlike.body.success).toBe(true);
        expect(resUnlike.body.data.data.isLiked).toBe(false);

        likes = await db.collection('likes').find({ post_id: postId, user_id: new ObjectId(userId) }).toArray();
        expect(likes.length).toBe(0);
    });
});
