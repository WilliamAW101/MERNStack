require('dotenv').config(); // for enviroment variables
const cors = require('cors');
const express = require('express');
const app = express();

const authenticationRoutes = require('./routes/authRoutes.js');

// Middleware
app.use(cors());
app.use(express.json());

// api routes
app.use('/api', authenticationRoutes);

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

app.listen(5000, () => {
    // start Node + Express server on port 5000
    console.log('Server listening on port 5000');
});
