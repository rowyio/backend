// --resolveJsonModule 
import express from 'express'
import { Firestore } from '@google-cloud/firestore'
const app = express();
// json is the default content-type for POST requests
app.use(express.json());

// get version
app.get('/version', (req, res) => {
  res.send({version: '1.0.0', date: '2021-09-5'});
});


// Exports for testing purposes.
module.exports = app;
