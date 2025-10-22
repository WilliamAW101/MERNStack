const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const validator = require('validator');

const hashPass = async (password) => { // its in the name
    const salt = 10;
    return await bcrypt.hash(password, salt);
}

const verifyPass = async (password, hashedPassword) => { // just unhashing the password and comparing
    return await bcrypt.compare(password, hashedPassword);
}

const generateToken = (user) => { // creates token, I don't think I need to add anything else to the payload?
    return jwt.sign(
        { id: user._id, userName: user.userName },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );
}

const checkExpired = (token) => { // validating the token
    try {
        jwt.verify(token, process.env.JWT_SECRET);
        return false;
    } catch (e) {
        return true;
    }
}

const refreshToken = (token) => { // refreshing token expiration
    const decode = jwt.decode(token);
    return generateToken(decode);
}

const extractTokenInfo = (token) => { // maybe this is redundant but I want to make it :p 
    const decode = jwt.decode(token);
    return decode;
}

module.exports = { hashPass, verifyPass, generateToken, checkExpired, extractTokenInfo };
