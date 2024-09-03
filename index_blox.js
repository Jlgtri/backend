const express = require("express");
const app = express();
const https = require("https");
const cors = require("cors");
const bodyParser = require("body-parser");
const { getTransactionDetails } = require("./controllers");
require("dotenv").config();
const isProduction = process.env.NODE_ENV === 'production';
const cron = require('node-cron');

// Schedule a task to run every minute
cron.schedule('*/10 * * * * *', () => {
    // console.log('running a task every 10 second');
    getTransactionDetails();
});


if (isProduction) {
    const fs = require('fs');
    var privateKey = fs.readFileSync('./privateKey.key', 'utf-8');
    var certificate = fs.readFileSync('./certificate.cer', 'utf-8');
    var ca = fs.readFileSync('./ca.cer', 'utf-8');
    const credientials = { key: privateKey, cert: certificate, ca: ca };

    https.createServer(credientials, app).listen(process.env.SECURE_PORT, () => {
        console.log(`We are connect SECURE on ${process.env.SECURE_PORT}`)
    });
} else {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server is running on port http://localhost:${PORT}`);
    });

}

// middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
    origin: "*",
    methods: "GET,POST",
    credentials: true
}));
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});
app.use('/api', express.static(__dirname + "/public"))


// router
app.use('/api', require("./routes/methods"));

