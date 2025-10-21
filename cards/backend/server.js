require('dotenv').config(); // for enviroment variables
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
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
    // THIS WILL CHANGE GOSH IT IS HORRIBLE
    // I am keeping this example for later
    // I will also look into JWT using express.js

    // Payload receiving: login, password
    // Payload sending: id, firstName, lastName, error
    let error = '';
    const { login, password } = req.body;
    const db = client.db(process.env.DATABASE);
    const results = await db
        .collection('users')
        .find({ Login: login, Password: password })
        .toArray();

    let id = -1;
    let fn = '';
    let ln = '';

    if (results.length > 0) {
        id = results[0].UserID;
        fn = results[0].FirstName;
        ln = results[0].LastName;
    }

    if (login.toLowerCase() === 'rickl' && password === 'COP4331') {
        id = 1;
        fn = 'Rick';
        ln = 'Leinecker';
    } else if (id === -1) {
        error = 'Invalid user name/password';
    }

    const ret = { id, firstName: fn, lastName: ln, error };
    res.status(200).json(ret);
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