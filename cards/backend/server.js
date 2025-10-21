require('dotenv').config(); // for enviroment variables
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const app = express();
const client = new MongoClient(process.env.DB_URL);

//import functions
const {
    hashPass,
    verifyPass
} = require('./utils/authentication.js');

// Connect to MongoDB
client.connect();

// Middleware
app.use(cors());
app.use(express.json());

// Simple ping route, good to make sure server is running
app.get('/api/ping', async (req, res) => {
    let error = 'NULL';
    try {
        const db = client.db(process.env.DATABASE);
    } catch (e) {
        error = e.toString();
    }
    const ret = { error };
    res.status(200).json({ message: 'Ping is successfull ' + ret.error });
});

// CORS headers (redundant with cors() but kept for explicit control)...Kool
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    next();
});

app.post('/api/login', async (req, res) => {
    // Payload receiving: userName, password
    // Payload sending: id, firstName, lastName, token, error
    try {
        const { userName, password } = req.body;

        // Validate input
        if (!userName || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const db = client.db(process.env.DATABASE);
        const collection = db.collection('user');

        // Find user by userName
        const user = await collection.findOne({ userName });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password using the authentication utility
        const isPasswordValid = await verifyPass(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: user._id, userName: user.userName },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
        );

        const ret = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            token,
            error: ''
        };

        res.status(200).json(ret);
    } catch (e) {
        console.error('Login error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/signup', async (req, res) => {
    let error = '';
    try {
        // Payload receiving: login, password
        // Payload sending: id, firstName, lastName, error
        // I will change if need be for frontend
        const { 
            userName, 
            password, 
            email, 
            phone, 
            firstName, 
            lastName
        } = req.body;

        // database info
        const db = client.db(process.env.DATABASE);
        const collection = db.collection('user'); // I really dont think we need to hide collection name
        console.log(hashPass, verifyPass);

        if (collection == null) {
          error = 'Database connection error';
          return res.status(500).json({ error });
        }
        
        const existingUser = await collection.findOne({
          $or: [{ userName }, { email }] // see if either the username or email exists already
        });
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists with that username or email' });
        }

        const hashedPassword = await hashPass(password); // hashing password

        const newUser = {
          userName,
          password: hashedPassword,
          email,
          phone,
          firstName,
          lastName,
          createdAt: new Date()
        };

        // insert new user into the database
        const result = await collection.insertOne(newUser);

        const ret = {
          id: result.insertedId,
          firstName,
          lastName,
          error: ''
        };

        res.status(201).json(ret);
    } catch (e) {
        console.error('Signup error:', e);
        res.status(500).json({ error: 'Internal server error' });
    }

});

app.post('/api/searchcards', async (req, res) => {
    // I am keeping this example for later
    let error = '';
    const { userId, search } = req.body;
    const _search = (search || '').trim();
    const db = client.db('COP4331Cards');

    const results = await db
        .collection('Cards')
        .find({ Card: { $regex: _search + '.*', $options: 'i' } })
        .toArray();

    const _ret = results.map((r) => r.Card);
    const ret = { results: _ret, error };
    res.status(200).json(ret);
});

app.listen(5000, () => {
    // start Node + Express server on port 5000
    console.log('Server listening on port 5000');
});