const express = require('express');
const router = express.Router();
const validator = require('validator');

// import functions
const { connectToDatabase } = require('../config/database.js');

const {
    hashPass,
    verifyPass,
    generateToken,
    genEmailToken,
    sendVerificationEmail,
    checkExpired,
    genResetCode,
    sendPasswordChangeToken
} = require('../utils/authentication.js');

const {
    responseJSON
} = require('../utils/json.js')

const {
    validateEmail
} = require('../utils/validation.js')

// Simple ping route, good to make sure server is running
router.get('/ping', async (req, res) => {
    let error = 'NULL';
    try {
        await connectToDatabase();
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'Ping failed ' + error, 500);
    }
    responseJSON(res, true, 'Ping is successfull', 'Server Connection Successfull!', 200);
});

router.post('/login', async (req, res) => {
    // Payload receiving: userName, password
    // Payload sending: id, firstName, lastName, token, error
    try {
        const { 
            userName,
            password 
        } = req.body;

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

        if (!user.verified) {
            return responseJSON(res, false, { code: 'Unauthorized' }, 'Email is not validated', 401);
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
          verified: false,
          profileDescription: null,
          profilePicture: null
        };

        // // Email verification
        const token = genEmailToken(normalizedEmail);
        const success = await sendVerificationEmail(normalizedEmail, token);
        if (!success) {
            return responseJSON(res, false, { code: 'Email address does not exist' }, 'Failed to send verification email', 553);
        }

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

router.get('/sendCode', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const codeCollection = db.collection('passwordVerify');
        
        const email = req.query.email;
        const validatedEmail = validateEmail(res, email);
        if (validatedEmail == null)
            return; // already set response within function
        // // Email verification
        const returnedResult = await genResetCode(res, validatedEmail);
        if (returnedResult == null)
            return;

        const id = returnedResult.id; // this will store the userID 
        const code = returnedResult.code;
        const storeCode = {
            code: code,
            id: id,
            createdAt: { type: Date, default: Date.now, expires: 3600 }
        };
        const success = await sendPasswordChangeToken(validatedEmail, code);
        if (!success) {
            return responseJSON(res, false, { code: 'Email address does not exist' }, 'Failed to send password change code', 553);
        }
        const result = await codeCollection.insertOne(storeCode);  

        const ret = {
          id: result.insertedId,
        };
        responseJSON(res, true, ret, 'Code emailed successfully!', 201);
    } catch (e) {
        console.error('Signup error:', e);
        responseJSON(res, false, { code: 'Internal server error' }, 'Failed to communicate with endpoint', 500);
    }
});

// payload will need a verification code that will be sent via email that the user has verified
router.post('/changePassword', async (req, res) => {
    const requiredFields = {
        code,
        newPassword,
        samePassword
    } = req.body;

    // check to see if everything is filled out
    const missingFields = Object.entries(requiredFields)
        .filter(([, value]) => value === undefined || value === null || value === '')
        .map(([key]) => key);
    if (missingFields.length > 0) {
        return responseJSON(res, false, { code: 'Bad Request' }, `Missing required field${missingFields.length > 1 ? 's' : ''}: ${missingFields.join(', ')}`, 400);
    }

    if (requiredFields.newPassword != requiredFields.samePassword)
        return responseJSON(res, false, { code: 'Unauthorized' }, 'Passwords do not match', 401)

    const db = await connectToDatabase();
    const codeCollection = db.collection('passwordVerify');
    // match the code
    const verification = await codeCollection.findOne({ code: requiredFields.code });
    if (!verification) {
      return responseJSON(res, false, { code: 'Unauthorized' }, 'Invalid Code', 401); 
    }

    // change the password
    const userCollection = db.collection('user');
    const hashedPassword = await hashPass(requiredFields.newPassword);


    // replace the old password with new
    const result = await userCollection.updateOne(
        {_id: verification.id},
        { $set: {password: hashedPassword} }
    );

    // delete the password verify document from collection
    const deleteResult = await codeCollection.deleteOne(
        { code: requiredFields.code }
    );
    if (result.deletedCount === 0) {
      console.log('No document found with that ID.');
    } else {
      console.log('Document deleted successfully.');
    }

    const ret = {
      id: result.insertedId,
    };
    responseJSON(res, true, ret, 'Password Change Success!', 201);
});

// Front end does not need to know this crap exists, just that it works
router.get('/verifyEmail', async (req, res) => {
    try {
        
        const db = await connectToDatabase();
        const collection = db.collection('user');

        const token = req.query.token;
        if (!token)
            return responseJSON(res, false, { code: 'Missing Token' }, 'Token was not provided', 400);

        const decodedToken = checkExpired(token);
        if (decodedToken == null) {
            return responseJSON(res, false, { code: 'Expired Token' }, 'Took too long to verify', 498);
        }

        const result = await collection.updateOne(
            { email: decodedToken.email},
            { $set: { verified: true}}
        );

        if (result.modifiedCount == 0) {
            return responseJSON(res, false, { code: 'Invalid User' }, 'User not found or already verified', 400);
        }
        
        responseJSON(res, true, 'Verification Successfull!', 'User has been successfully verified!', 200);
    } catch (e) {
        error = e.toString();
        responseJSON(res, false, { code: 'Internal server error' }, 'Couldnt Communicate with endpoint', 500);
    }
});

module.exports = router;