const app = require('./app');

const PORT = process.env.PORT || 5000;

// Only start the HTTP listener when this file is executed directly.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}

module.exports = app;
