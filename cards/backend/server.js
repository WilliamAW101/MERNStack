const app = require('./app');

const authenticationRoutes = require('./routes/authRoutes.js');
const postRoutes = require('./routes/postRoutes.js');
const homePageRoutes = require('./routes/homepageRoutes.js');
const PORT = process.env.PORT || 5000;

// Only start the HTTP listener when this file is executed directly.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

// api routes
app.use('/api', authenticationRoutes);
app.use('/api', postRoutes);
app.use('/api', homePageRoutes);

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

module.exports = app;
