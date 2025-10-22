const { MongoClient } = require('mongodb');

let client;

const connectToDatabase = async () => {
    if  (!client) {
        client = new MongoClient(process.env.DB_URL);
        await client.connect();
        console.log('Successfully Connected to Cluster')
    }
    return client.db(process.env.DATABASE)
}

module.exports = connectToDatabase;