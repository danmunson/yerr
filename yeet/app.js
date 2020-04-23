const express = require('express');
const bodyParser = require('body-parser');
const channel = require('./routes/channels.route'); // Imports routes for the products
const app = express();

// Setup db

const mongoose = require('mongoose');
let local_db_url = 'mongodb://localhost:27017/yerr-db';
let mongoDB = local_db_url;
mongoose.connect(mongoDB);
mongoose.Promise = global.Promise;
let db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
 // set the view engine to ejs
app.set('view engine', 'ejs')
app.use('/channels', channel);

let port = 1234;

app.listen(port, () => {
    console.log('Server is up and running on port numner ' + port);
});
