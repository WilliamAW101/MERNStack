const validator = require('validator');

const {
    responseJSON
} = require('../utils/json.js')

const validateEmail = (res, email) => {
    // validate email format
    const normalizedEmail = (email || '').trim().toLowerCase(); // looks like most providers do not care about case sensitivity, can change if need be
    if (!validator.isEmail(normalizedEmail)) { 
        responseJSON(res, false, { code: 'Bad Request' }, 'Invalid email format', 400);
        return null;
    }
    return normalizedEmail;
}

module.exports = { validateEmail };