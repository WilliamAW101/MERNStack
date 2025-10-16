const express = require('express');
const cors = require('cors');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb+srv://vterry1011:mern@cluster0.5ow25p9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

const client = new MongoClient(url);
client.connect()

app.use(cors());
// app.use(bodyParser.json());
app.use(express.json());
app.use((req, res, next) =>
{
app.get("/api/ping", (req, res, next) => {
res.status(200).json({ message: "Hello World" });
});
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader(
'Access-Control-Allow-Headers',
'Origin, X-Requested-With, Content-Type, Accept, Authorization'
);
res.setHeader(
'Access-Control-Allow-Methods',
'GET, POST, PATCH, DELETE, OPTIONS'
);
next();
});
app.listen(5000); // start Node + Express server on port 5000
