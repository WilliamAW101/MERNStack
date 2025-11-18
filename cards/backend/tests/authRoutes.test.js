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
        db.collection('notifications').deleteMany({}).catch(() => null),
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

    it('rejects when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/signup')
            .send({
                userName: '',
                password: '',
                email: 'janedoe@example.com',
                phone: '',
                firstName: '',
                lastName: '',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/missing required field/i);
        expect(res.body.message).toMatch(/userName/i);
    });

    it('rejects invalid email format', async () => {
        const res = await request(app)
            .post('/api/signup')
            .send({
                userName: 'bademail',
                password: 'ValidPass123!',
                email: 'not-an-email',
                phone: '123-456-7890',
                firstName: 'Jane',
                lastName: 'Doe',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid email format/i);
    });

    it('rejects when user already exists with same username or email', async () => {
        const db = await connectToDatabase();
        await db.collection('user').insertOne({
            userName: 'janedoe',
            password: await hashPass('ExistingPass123!'),
            email: 'janedoe@example.com',
            phone: '123-456-7890',
            firstName: 'Existing',
            lastName: 'User',
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
            .post('/api/signup')
            .send({
                userName: 'janedoe',
                password: 'ValidPass123!',
                email: 'janedoe@example.com',
                phone: '123-456-7890',
                firstName: 'Jane',
                lastName: 'Doe',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/user already exists/i);
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

    it('rejects login when username or password is missing', async () => {
        const res = await request(app)
            .post('/api/login')
            .send({ userName: 'veronica' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/username and password are required/i);
    });

    it('rejects login when password is incorrect', async () => {
        const db = await connectToDatabase();
        const plainPassword = 'CorrectPass123!';
        await db.collection('user').insertOne({
            userName: 'wrongpass',
            password: await hashPass(plainPassword),
            email: 'wrongpass@example.com',
            phone: '111-222-3333',
            firstName: 'Wrong',
            lastName: 'Pass',
            verified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
            .post('/api/login')
            .send({ userName: 'wrongpass', password: 'NotTheRightPassword!' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid username or password/i);
    });

    it('rejects login when user email is not verified', async () => {
        const db = await connectToDatabase();
        const plainPassword = 'StrongPass987!';
        await db.collection('user').insertOne({
            userName: 'unverified',
            password: await hashPass(plainPassword),
            email: 'unverified@example.com',
            phone: '111-222-3333',
            firstName: 'Un',
            lastName: 'Verified',
            verified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const res = await request(app)
            .post('/api/login')
            .send({ userName: 'unverified', password: plainPassword });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/email is not validated/i);
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

    it('rejects when email format is invalid', async () => {
        const res = await request(app)
            .get('/api/sendCode')
            .query({ email: 'not-an-email' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid email format/i);
    });

    it('rejects when email does not exist in the system', async () => {
        const res = await request(app)
            .get('/api/sendCode')
            .query({ email: 'doesnotexist@example.com' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/email does not exist/i);
    });

    it('returns a 553 error when sending the reset email fails', async () => {
        const db = await connectToDatabase();
        const email = 'resetfail@example.com';

        const { insertedId } = await db.collection('user').insertOne({
            userName: 'resetFailUser',
            password: await hashPass('OldPass123!'),
            email,
            phone: '000-000-0000',
            firstName: 'Reset',
            lastName: 'Fail',
            verified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const sgMail = require('@sendgrid/mail');
        sgMail.send.mockRejectedValueOnce(new Error('send failed'));

        const res = await request(app)
            .get('/api/sendCode')
            .query({ email });

        expect(res.status).toBe(553);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/failed to send password change code/i);

        const storedCode = await db.collection('passwordVerify').findOne({ id: insertedId });
        expect(storedCode).toBeNull();
    });
});

describe('POST /api/checkCode', () => {
    it('rejects when code is empty', async () => {
        const res = await request(app)
            .post('/api/checkCode')
            .send({ code: '' });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/missing required field/i);
    });

    it('rejects when code does not exist', async () => {
        const res = await request(app)
            .post('/api/checkCode')
            .send({ code: '999999' });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid code/i);
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

        // First verify the reset code to obtain the user id
        const codeRes = await request(app)
            .post('/api/checkCode')
            .send({ code: resetCode });

        expect(codeRes.status).toBe(200);
        expect(codeRes.body.success).toBe(true);

        const { id } = codeRes.body.data;

        const res = await request(app)
            .post('/api/changePassword')
            .send({
                id,
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
                id: new ObjectId().toString(),
                newPassword: 'one',
                samePassword: 'two',
            });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/passwords do not match/i);
    });

    it('rejects when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/changePassword')
            .send({
                id: '',
                newPassword: '',
                samePassword: '',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/missing required field/i);
    });

    it('returns an error when user id does not exist', async () => {
        const res = await request(app)
            .post('/api/changePassword')
            .send({
                id: new ObjectId().toString(),
                newPassword: 'SomeNewPass1!',
                samePassword: 'SomeNewPass1!',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/no user found with that id/i);
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
        expect(res.text).toMatch(/successfully verified/i);

        const verifiedUser = await db.collection('user').findOne({ email });
        expect(verifiedUser.verified).toBe(true);
    });

    it('rejects when token is missing', async () => {
        const res = await request(app)
            .get('/api/verifyEmail')
            .query({});

        expect(res.status).toBe(200);
        expect(res.text).toMatch(/token was not provided/i);
    });

    it('rejects when token is expired', async () => {
        const email = 'expired@example.com';
        const expiredToken = jwt.sign(
            { email, exp: Math.floor(Date.now() / 1000) - 60 },
            process.env.JWT_SECRET
        );

        const res = await request(app)
            .get('/api/verifyEmail')
            .query({ token: expiredToken });

        expect(res.status).toBe(200);
        expect(res.text).toMatch(/verification link has expired/i);
    });

    it('returns an error when the user for a valid token is not found', async () => {
        const email = 'missinguser@example.com';
        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const res = await request(app)
            .get('/api/verifyEmail')
            .query({ token });

        expect(res.status).toBe(200);
        expect(res.text).toMatch(/user not found or email already verified/i);
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

    it('rejects unsupported content types', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'invalidContentType' });

        const res = await request(app)
            .post('/api/uploads/url')
            .set('Authorization', `Bearer ${token}`)
            .send({ contentType: 'application/json', ext: 'json' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/invalid contenttype/i);
    });

    it('returns 500 when presign generation fails', async () => {
        const { token, userId } = await createVerifiedUserWithToken({ userName: 'presignFail' });

        mockGetSignedUrl.mockRejectedValueOnce(new Error('presign error'));

        const res = await request(app)
            .post('/api/uploads/url')
            .set('Authorization', `Bearer ${token}`)
            .send({ contentType: 'image/jpeg', ext: 'jpg' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('presign-failed');
        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
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

    it('returns 500 when generating a download URL fails', async () => {
        mockGetSignedUrl.mockRejectedValueOnce(new Error('download error'));
        const { token } = await createVerifiedUserWithToken({ userName: 'downloadFail' });

        const res = await request(app)
            .post('/api/downloads/url')
            .set('Authorization', `Bearer ${token}`)
            .send({ key: 'posts/some-user/some-key.jpg' });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe('sign-get-failed');
        expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);
    });
});

describe('Notification routes', () => {
    describe('GET /api/notifications', () => {
        it('returns user and global notifications for an authenticated user', async () => {
            const { token, userId } = await createVerifiedUserWithToken({ userName: 'notifyUser' });
            const db = await connectToDatabase();

            const notifications = db.collection('notifications');

            await notifications.insertMany([
                {
                    sendTo: userId,
                    isGlobal: false,
                    isSeen: false,
                    isRead: false,
                    data: { type: 'comment', timestamp: new Date() },
                },
                {
                    isGlobal: true,
                    isSeen: false,
                    isRead: false,
                    data: { type: 'announcement', timestamp: new Date() },
                },
                {
                    sendTo: new ObjectId().toString(),
                    isGlobal: false,
                    isSeen: false,
                    isRead: false,
                    data: { type: 'other', timestamp: new Date() },
                },
            ]);

            const res = await request(app)
                .get('/api/notifications')
                .set('Authorization', `Bearer ${token}`)
                .query({ limit: 10, skip: 0 });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data.notifications)).toBe(true);
            expect(res.body.data.count).toBe(2);
        });

        it('rejects unauthenticated requests', async () => {
            const res = await request(app)
                .get('/api/notifications')
                .query({ limit: 10, skip: 0 });

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/access token required/i);
        });
    });

    describe('GET /api/notifications/unseen-count', () => {
        it('returns unseen notification count for the user', async () => {
            const { token, userId } = await createVerifiedUserWithToken({ userName: 'unseenUser' });
            const db = await connectToDatabase();
            const notifications = db.collection('notifications');

            await notifications.insertMany([
                {
                    sendTo: userId,
                    isGlobal: false,
                    isSeen: false,
                    data: { type: 'comment', timestamp: new Date() },
                },
                {
                    sendTo: userId,
                    isGlobal: false,
                    isSeen: true,
                    data: { type: 'like', timestamp: new Date() },
                },
                {
                    isGlobal: true,
                    isSeen: false,
                    data: { type: 'announcement', timestamp: new Date() },
                },
                {
                    isGlobal: true,
                    isSeen: true,
                    data: { type: 'another', timestamp: new Date() },
                },
                {
                    sendTo: new ObjectId().toString(),
                    isGlobal: false,
                    isSeen: false,
                    data: { type: 'ignored', timestamp: new Date() },
                },
            ]);

            const res = await request(app)
                .get('/api/notifications/unseen-count')
                .set('Authorization', `Bearer ${token}`)
                .query({});

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.unseenCount).toBe(2);
        });

        it('rejects unauthenticated requests', async () => {
            const res = await request(app)
                .get('/api/notifications/unseen-count')
                .query({});

            expect(res.status).toBe(401);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/access token required/i);
        });
    });

    describe('POST /api/notifications/mark-all-seen', () => {
        it('marks all notifications as seen and returns a refreshed token', async () => {
            const { token, userId } = await createVerifiedUserWithToken({ userName: 'markAllUser' });
            const db = await connectToDatabase();
            const notifications = db.collection('notifications');

            await notifications.insertMany([
                {
                    sendTo: userId,
                    isGlobal: false,
                    isSeen: false,
                    data: { type: 'comment', timestamp: new Date() },
                },
                {
                    isGlobal: true,
                    isSeen: false,
                    data: { type: 'announcement', timestamp: new Date() },
                },
            ]);

            const res = await request(app)
                .post('/api/notifications/mark-all-seen')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.data.modifiedCount).toBeGreaterThanOrEqual(1);
            expect(res.body.data.refreshedToken).toBeTruthy();

            const stored = await notifications
                .find({
                    $or: [
                        { sendTo: userId, isGlobal: false },
                        { isGlobal: true },
                    ],
                })
                .toArray();

            expect(stored.every(n => n.isSeen === true)).toBe(true);
        });
    });

    describe('POST /api/notifications/mark-read', () => {
        it('marks a single notification as read', async () => {
            const { token, userId } = await createVerifiedUserWithToken({ userName: 'markReadUser' });
            const db = await connectToDatabase();
            const notifications = db.collection('notifications');

            const { insertedId } = await notifications.insertOne({
                sendTo: userId,
                isGlobal: false,
                isSeen: false,
                isRead: false,
                data: { type: 'comment', timestamp: new Date() },
            });

            const res = await request(app)
                .post('/api/notifications/mark-read')
                .set('Authorization', `Bearer ${token}`)
                .send({ notificationId: insertedId.toString() });

            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data.refreshedToken).toBeTruthy();

            const updated = await notifications.findOne({ _id: insertedId });
            expect(updated.isRead).toBe(true);
            expect(updated.readAt).toBeInstanceOf(Date);
        });

        it('rejects when notificationId is missing', async () => {
            const { token } = await createVerifiedUserWithToken({ userName: 'missingIdUser' });

            const res = await request(app)
                .post('/api/notifications/mark-read')
                .set('Authorization', `Bearer ${token}`)
                .send({});

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/notification id is required/i);
        });

        it('rejects when notificationId format is invalid', async () => {
            const { token } = await createVerifiedUserWithToken({ userName: 'invalidIdUser' });

            const res = await request(app)
                .post('/api/notifications/mark-read')
                .set('Authorization', `Bearer ${token}`)
                .send({ notificationId: 'not-a-valid-object-id' });

            expect(res.status).toBe(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/invalid notification id format/i);
        });

        it('returns 404 when notification is not found for the user', async () => {
            const { token, userId } = await createVerifiedUserWithToken({ userName: 'notFoundUser' });
            const db = await connectToDatabase();
            const notifications = db.collection('notifications');

            const { insertedId } = await notifications.insertOne({
                sendTo: new ObjectId().toString(),
                isGlobal: false,
                isSeen: false,
                isRead: false,
                data: { type: 'comment', timestamp: new Date() },
            });

            const res = await request(app)
                .post('/api/notifications/mark-read')
                .set('Authorization', `Bearer ${token}`)
                .send({ notificationId: insertedId.toString() });

            expect(res.status).toBe(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toMatch(/notification not found/i);
        });
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
            userId: new ObjectId(userId),
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
                userId: new ObjectId(userId),
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
                userId: new ObjectId(userId),
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

describe('PUT /api/changeProfileInfo', () => {
    it('updates profile fields for an authenticated user', async () => {
        const { token, userId, userDoc } = await createVerifiedUserWithToken({ userName: 'changeProfileUser' });
        const db = await connectToDatabase();

        const res = await request(app)
            .put('/api/changeProfileInfo')
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

    it('rejects when caption is missing', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'no-caption-user' });

        const res = await request(app)
            .post('/api/addPost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                difficulty: 1,
                rating: 1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Caption is required');
    });

    it('rejects when difficulty is missing', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'no-difficulty-user' });

        const res = await request(app)
            .post('/api/addPost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                caption: 'Some caption',
                rating: 1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Difficulty is required');
    });

    it('rejects when rating is missing', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'no-rating-user' });

        const res = await request(app)
            .post('/api/addPost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                caption: 'Some caption',
                difficulty: 1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Rating is required');
    });

    it('rejects when difficulty is negative', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'negative-difficulty-user' });

        const res = await request(app)
            .post('/api/addPost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                caption: 'Some caption',
                difficulty: -1,
                rating: 1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Difficulty must be a non-negative number');
    });

    it('rejects when rating is negative', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'negative-rating-user' });

        const res = await request(app)
            .post('/api/addPost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                caption: 'Some caption',
                difficulty: 1,
                rating: -1,
            });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('Rating must be a non-negative number');
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

    it('rejects when postId is missing', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'missingPostIdUser' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                caption: 'Updated caption',
                difficulty: 2,
                rating: 3,
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/post id is required/i);
    });

    it('rejects when postId format is invalid', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'invalidIdUser' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                postId: 'not-a-valid-object-id',
                caption: 'Updated caption',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/invalid post id format/i);
    });

    it('returns 404 when the post does not exist', async () => {
        const { token } = await createVerifiedUserWithToken({ userName: 'missingPostUser' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                postId: new ObjectId().toString(),
                caption: 'Updated caption',
            });

        expect(res.status).toBe(404);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/post not found/i);
    });

    it('rejects updates from a user who does not own the post', async () => {
        const owner = await createUserWithPost({ userName: 'ownerUser' }, { caption: 'Owner caption' });
        const other = await createVerifiedUserWithToken({ userName: 'otherUser' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${other.token}`)
            .send({
                postId: owner.postId.toString(),
                caption: 'Attempted update',
            });

        expect(res.status).toBe(403);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/do not have permission to update this post/i);
    });

    it('rejects when caption is an empty string', async () => {
        const { token, postId } = await createUserWithPost({ userName: 'emptyCaptionUser' }, { caption: 'Old caption' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                postId: postId.toString(),
                caption: '   ',
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/caption must be a non-empty string/i);
    });

    it('rejects when difficulty is negative', async () => {
        const { token, postId } = await createUserWithPost({ userName: 'negativeDifficultyUpdate' }, { caption: 'Old caption' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                postId: postId.toString(),
                difficulty: -1,
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/difficulty must be a non-negative number/i);
    });

    it('rejects when rating is negative', async () => {
        const { token, postId } = await createUserWithPost({ userName: 'negativeRatingUpdate' }, { caption: 'Old caption' });

        const res = await request(app)
            .put('/api/updatePost')
            .set('Authorization', `Bearer ${token}`)
            .send({
                postId: postId.toString(),
                rating: -1,
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/rating must be a non-negative number/i);
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
        expect(res.body.data.caption).toBe('Test post');
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
