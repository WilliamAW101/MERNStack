require('dotenv').config(); // for environment variables
const cors = require('cors');
const express = require('express');
const uploadsRouter = require('./routes/uploads');
const authenticationRoutes = require('./routes/authRoutes.js');
const postRoutes = require('./routes/postRoutes.js');
const homePageRoutes = require('./routes/homepageRoutes.js');
const profileRoutes = require('./routes/profileRoutes.js');
const notificationRoutes = require('./routes/notificationRoutes.js');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// api routes
app.use('/api', uploadsRouter);
app.use('/api', authenticationRoutes);
app.use('/api', postRoutes);
app.use('/api', homePageRoutes);
app.use('/api', profileRoutes);
app.use('/api', notificationRoutes);

// CORS headers (redundant with cors() but kept for explicit control)...Kool
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    next();
});

module.exports = app;
