const { decode } = require('jsonwebtoken');
const { checkExpired } = require('../utils/authentication.js');

const authenticateToken = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    // Verify token
    const decoded = checkExpired(token);

    if (!decoded) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Attach user info to request object
    req.user = {
        id: decoded.id,
        userName: decoded.userName,
        token: token
    };
    next();
};

module.exports = { authenticateToken };
