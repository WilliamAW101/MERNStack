const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectToDatabase = require('../config/database');
const closeDatabase = connectToDatabase.closeDatabase;
const { hashPass } = require('../utils/authentication');

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
    const db = await connectToDatabase();
    await Promise.all([
        db.collection('user').deleteMany({}),
        db.collection('passwordVerify').deleteMany({}).catch(() => null),
    ]);
});

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
