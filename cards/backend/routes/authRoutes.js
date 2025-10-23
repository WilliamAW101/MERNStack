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

const {
    responseJSON
} = require('../utils/json.js')

// Simple ping route, good to make sure server is running
router.get('/ping', async (req, res) => {
    let error = 'NULL';
    try {
        await connectToDatabase();
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'Ping failed ' + error, 500);
    }
    responseJSON(res, true, 'Ping is successfull', 'User signed up successfully!', 200);
});

router.post('/login', async (req, res) => {
    // Payload receiving: userName, password
    // Payload sending: id, firstName, lastName, token, error
    try {
        const { userName, password } = req.body;

        // Validate input
        if (!userName || !password) {
            return responseJSON(res, false, { code: 'Bad Request' }, 'Username and password are required', 400);
        }

        const db = await connectToDatabase();
        const collection = db.collection('user');

        // Find user by userName
        const user = await collection.findOne({ userName });

        if (!user) {
            return responseJSON(res, false, { code: 'Unauthorized' }, 'Invalid username or password', 401)
        }

        // Verify password using the authentication utility
        const isPasswordValid = await verifyPass(password, user.password);

        if (!isPasswordValid) {
            return responseJSON(res, false, { code: 'Unauthorized' }, 'Invalid username or password', 401)
        }

        // Generate JWT token
        const token = generateToken(user);

        const ret = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            token,
        };

        responseJSON(res, true, ret, 'User logged in successfully!', 200);
    } catch (e) {
        console.error('Login error:', e);
        responseJSON(res, false, { code: 'Internal server error' }, 'Failed to communicate with endpoint', 500);
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
            return responseJSON(res, false, { code: 'Bad Request' }, `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`, 400);
        }

        // validate email format
        const normalizedEmail = (email || '').trim().toLowerCase(); // looks like most providers do not care about case sensitivity, can change if need be
        if (!validator.isEmail(normalizedEmail)) { 
            return responseJSON(res, false, { code: 'Bad Request' }, 'Invalid email format', 400);
        }

        // database info
        const db = await connectToDatabase();
        const collection = db.collection('user'); // I really dont think we need to hide collection name
        if (collection == null) {
          error = 'Internal Server Error';
          return responseJSON(res, false, { code: error }, 'Failed to connect to database', 500);
        }

        const existingUser = await collection.findOne({
          $or: [{ userName }, { normalizedEmail }] // see if either the username or email exists already
        });
        if (existingUser) {
          return responseJSON(res, false, { code: 'Bad Request' }, 'User already exists with that username or email', 400);
        }

        const hashedPassword = await hashPass(password); // hashing password

        const newUser = {
          userName,
          password: hashedPassword,
          email: normalizedEmail,
          phone,
          firstName,
          lastName,
          createdAt: new Date(),
          updatedAt: new Date(),
          verified: false
        };

        // insert new user into the database
        const result = await collection.insertOne(newUser);

        const ret = {
          id: result.insertedId,
          firstName,
          lastName,
        };
        responseJSON(res, true, ret, 'User signed up successfully!', 201);
    } catch (e) {
        console.error('Signup error:', e);
        responseJSON(res, false, { code: 'Internal server error' }, 'Failed to communicate with endpoint', 500);
    }

});

module.exports = router;