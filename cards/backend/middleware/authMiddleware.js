const { checkExpired } = require('../utils/authentication.js');

const authenticateToken = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return responseJSON(res, false, { code: 'Unauthorized' }, 'Access token required', 401);
    }

    // Verify token
    const decoded = checkExpired(token);

    if (!decoded) {
        return responseJSON(res, false, { code: 'Forbidden' }, 'Invalid or expired token', 403);
    }

    // Attach user info to request object
    req.user = {
        id: decoded.id,
        userName: decoded.userName
    };

    next();
};

module.exports = { authenticateToken };