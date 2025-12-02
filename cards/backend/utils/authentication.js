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
  const userId = user._id || user.id;
  return jwt.sign(
      { id: userId.toString(), userName: user.userName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
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
  const baseURL = process.env.BASE_URL || 'http://localhost:5000';
  const verifyLink = `${baseURL}/api/verifyEmail?token=${token}`;

  const mailOptions = {
    from: `"Crag Tag" <${process.env.EMAIL_USER}>`,
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
    console.log(verifyLink);
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
    from: `"Crag Tag" <${process.env.EMAIL_USER}>`,
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
  const code = (parseInt(crypto.randomBytes(3).toString('hex'), 16) % 1000000).toString().padStart(6, '0');
  const id = user._id;
  return { id, code };
}

function getVerificationHTML(success, message) {
    const backgroundColor = success ? '#10b981' : '#5A7156';
    const icon = success ? '✓' : '✗';
    const title = success ? 'Email Verified!' : 'Verification Failed';
    const buttonText = success ? 'Go to Crag Tag' : 'Back to Home';
    const appUrl = process.env.CLIENT_URL || 'http://localhost:5000';
    
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Crag Tag</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background: linear-gradient(135deg, #5A7156 0%, #6C8867 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                padding: 60px 40px;
                text-align: center;
                max-width: 500px;
                width: 100%;
                animation: slideIn 0.5s ease-out;
            }
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .icon {
                width: 80px;
                height: 80px;
                background: ${backgroundColor};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 30px;
                font-size: 48px;
                color: white;
                animation: scaleIn 0.5s ease-out 0.2s backwards;
            }
            @keyframes scaleIn {
                from {
                    transform: scale(0);
                }
                to {
                    transform: scale(1);
                }
            }
            h1 {
                font-size: 32px;
                color: #1f2937;
                margin-bottom: 15px;
            }
            p {
                font-size: 18px;
                color: #6b7280;
                margin-bottom: 30px;
                line-height: 1.6;
            }
            .button {
                display: inline-block;
                background: ${backgroundColor};
                color: white;
                padding: 14px 32px;
                border-radius: 10px;
                text-decoration: none;
                font-weight: 600;
                font-size: 16px;
                transition: all 0.3s ease;
                border: none;
                cursor: pointer;
            }
            .button:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
                opacity: 0.9;
            }
            .logo {
                font-size: 24px;
                font-weight: bold;
                color: #000000ff;
                margin-bottom: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="logo">🧗 Crag Tag</div>
            <div class="icon">${icon}</div>
            <h1>${title}</h1>
            <p>${message}</p>
            <a href="${appUrl}" class="button">${buttonText}</a>
        </div>
        ${success ? `
        <script>
            // Auto-redirect after 3 seconds on success
            setTimeout(() => {
                window.location.href = '${appUrl}';
            }, 3000);
        </script>
        ` : ''}
    </body>
    </html>
    `;
}

module.exports = { hashPass, verifyPass, generateToken, checkExpired, sendVerificationEmail, genEmailToken, sendPasswordChangeToken, genResetCode, refreshToken, getVerificationHTML };
