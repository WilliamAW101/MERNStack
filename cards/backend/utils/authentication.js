const bcrypt = require('bcryptjs');

const hashPass = async (password) => {
    const salt = 10;
    return await bcrypt.hash(password, salt);
}

const verifyPass = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
}

module.exports = { hashPass, verifyPass };