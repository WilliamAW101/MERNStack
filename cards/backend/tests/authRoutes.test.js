const request = require('supertest');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectToDatabase = require('../config/database');
const closeDatabase = connectToDatabase.closeDatabase;
const { hashPass } = require('../utils/authentication');

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
    mongoServer = await MongoMemoryServer.create(); //launches a temporary mongod just for tests
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

    mockGetSignedUrl.mockReset();
    mockGetSignedUrl.mockResolvedValue('https://example.com/signed');

    const db = await connectToDatabase();
    await Promise.all([
        db.collection('user').deleteMany({}),
        db.collection('passwordVerify').deleteMany({}).catch(() => null),
        db.collection('post').deleteMany({}).catch(() => null),
        db.collection('post').deleteMany({}).catch(() => null),
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
        expect(res.body.error).toMatch(/access token required/i);
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
        expect(res.body.error).toBe('');
        expect(res.body.postId).toBeTruthy();
        expect(res.body.timestamp).toBeTruthy();

        const createdId = res.body.postId?.$oid || res.body.postId;

        const db = await connectToDatabase();
        const storedPost = await db
            .collection('post')
            .findOne({ _id: new ObjectId(createdId) });

        expect(storedPost).toMatchObject({
            userId,
            caption: payload.caption,
            difficulty: payload.difficulty,
            rating: payload.rating
        });
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
        expect(res.body.error).toMatch(/access token required/i);
    });
});
