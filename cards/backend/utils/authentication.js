const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const hashPass = async (password) => {
    const salt = 10;
    return await bcrypt.hash(password, salt);
}

const verifyPass = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
}

const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, userName: user.userName },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
}

module.exports = { hashPass, verifyPass, generateToken };
