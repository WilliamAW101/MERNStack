const { checkExpired } = require('../utils/authentication.js');
<<<<<<< HEAD
const { responseJSON } = require('../utils/json.js');
=======
>>>>>>> 822bcc8 (Got AWS connected and endpoints for uploading and viewing media from s3)

const authenticateToken = (req, res, next) => {
    // Get token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
<<<<<<< HEAD
        return responseJSON(res, false, { code: 'Unauthorized' }, 'Access token required', 401);
=======
        return res.status(401).json({ error: 'Access token required' });
>>>>>>> 822bcc8 (Got AWS connected and endpoints for uploading and viewing media from s3)
    }

    // Verify token
    const decoded = checkExpired(token);

    if (!decoded) {
<<<<<<< HEAD
        return responseJSON(res, false, { code: 'Forbidden' }, 'Invalid or expired token', 403);
=======
        return res.status(403).json({ error: 'Invalid or expired token' });
>>>>>>> 822bcc8 (Got AWS connected and endpoints for uploading and viewing media from s3)
    }

    // Attach user info to request object
    req.user = {
        id: decoded.id,
        userName: decoded.userName
        userName: decoded.userName
    };

    next();
};

module.exports = { authenticateToken };
>>>>>>> 822bcc8 (Got AWS connected and endpoints for uploading and viewing media from s3)
