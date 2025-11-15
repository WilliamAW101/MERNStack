const { checkExpired } = require('../utils/authentication.js');
const { responseJSON } = require('../utils/json.js');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return responseJSON(res, false, { code: 'Unauthorized' }, 'Access token required', 401);
    }

    const decoded = checkExpired(token);

    if (!decoded) {
        return responseJSON(res, false, { code: 'Unauthorized' }, 'Invalid or expired token', 403);
    }

    req.user = {
        id: decoded.id,
        userName: decoded.userName,
        token
    };
    next();
};

module.exports = { authenticateToken };
