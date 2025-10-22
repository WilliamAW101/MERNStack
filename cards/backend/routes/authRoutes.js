const express = require('express');
const router = express.Router();
const validator = require('validator');

// import functions
const connectToDatabase = require('../config/database.js')

const {
    hashPass,
    verifyPass,
    generateToken
} = require('../utils/authentication.js');

// Simple ping route, good to make sure server is running
router.get('/ping', async (req, res) => {
    let error = 'NULL';
    try {
        await connectToDatabase();
    } catch (e) {
        error = e.toString();
        res.status(500).json({ message: 'Ping failed ' + error });
    }
    res.status(200).json({ message: 'Ping is successfull ' + error });
});

router.post('/login', async (req, res) => {
    // Payload receiving: userName, password
    // Payload sending: id, firstName, lastName, token, error
    try {
        const { userName, password } = req.body;

        // Validate input
        if (!userName || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const db = await connectToDatabase();
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
        const token = generateToken(user);

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

router.post('/signup', async (req, res) => {
    let error = '';
    try {

        // payload receiving
        const requiredFields = {
            userName,
            password,
            email,
            phone,
            firstName,
            lastName
        } = req.body;


        // check to see if everything is filled out
        const missingFields = Object.entries(requiredFields)
            .filter(([, value]) => value === undefined || value === null || value === '')
            .map(([key]) => key);

        if (missingFields.length > 0) {
            return res.status(400).json({
                error: `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`
            });
        }

        // validate email format
        const normalizedEmail = (email || '').trim().toLowerCase(); // looks like most providers do not care about case sensitivity, can change if need be
        if (!validator.isEmail(normalizedEmail)) { return res.status(400).json({ error: 'Invalid email format' }); }
        

        // database info
        const db = await connectToDatabase();
        const collection = db.collection('user'); // I really dont think we need to hide collection name
        if (collection == null) {
          error = 'Database connection error';
          return res.status(500).json({ error });
        }

        const existingUser = await collection.findOne({
          $or: [{ userName }, { normalizedEmail }] // see if either the username or email exists already
        });
        if (existingUser) {
          return res.status(400).json({ error: 'User already exists with that username or email' });
        }

        const hashedPassword = await hashPass(password); // hashing password

        const newUser = {
          userName,
          password: hashedPassword,
          email: normalizedEmail,
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

module.exports = router;