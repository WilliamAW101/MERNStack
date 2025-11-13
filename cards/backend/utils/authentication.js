const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sgMail = require('@sendgrid/mail');
const { connectToDatabase } = require('../config/database.js');
const crypto = require('crypto');

const {
    responseJSON
} = require('../utils/json.js')

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
      return jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
      return null;
  }
}

const refreshToken = (token) => { // refreshing token expiration
  const decode = jwt.decode(token);
  return generateToken(decode);
}

const sendVerificationEmail = async (to, token) => {
  sgMail.setApiKey(process.env.SENDGRIND_API_KEY);
  const verifyLink = `http://localhost:5000/api/verifyEmail?token=${token}`; // will need to change later

  const mailOptions = {
    from: `"CraigTag" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your email address',
    html: `
      <h2>Welcome!</h2>
      <p>Thanks for signing up. Please verify your email address by clicking the link below:</p>
      <a href="${verifyLink}" 
         style="display:inline-block;padding:10px 15px;background:#4CAF50;color:white;text-decoration:none;border-radius:5px;">
         Verify Email
      </a>
      <p>This link will expire in 24 hours.</p>
    `
  };

  try {
    await sgMail.send(mailOptions);
    console.log(`Verification email sent to ${to}`);
    return true;
  } catch (err) {
    console.error('Error sending email:', err);
    return false;
  }
}

const sendPasswordChangeToken = async (to, code) => {
  sgMail.setApiKey(process.env.SENDGRIND_API_KEY);

  const mailOptions = {
    from: `"CraigTag" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Code for Password Change',
    html: `
      <h2>Your Verification Code is:</h2>
      <h3>${code}</h3>
    `
  };

  try {
    await sgMail.send(mailOptions);
    console.log(`Verification email sent to ${to}`);
    return true;
  } catch (err) {
    console.error('Error sending email:', err);
    return false;
  }
}

const genEmailToken = (email) => {
  return jwt.sign(
    { email },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
}

const genResetCode = async (res, email) => {

  const db = await connectToDatabase();
  const userCollection = db.collection('user');

  // Find user by email
  const user = await userCollection.findOne({ email });
  if (!user) {
    responseJSON(res, false, { code: 'Unauthorized' }, 'Email does not exist', 401)
    return null;
  }

  // generating code for user to provide
  const length = 16;
  const code = crypto.randomBytes(length).toString('hex');
  const id = user._id;
  return { id, code };
}

module.exports = { hashPass, verifyPass, generateToken, checkExpired, sendVerificationEmail, genEmailToken, sendPasswordChangeToken, genResetCode };
