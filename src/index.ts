// --resolveJsonModule 
import express from 'express'
import { db } from './firebaseConfig'
import { restrictedRequest } from './utils'
import { deleteUser, impersonateUser, inviteUser, setUserRoles } from './userManagement';
import { functionBuilder } from './functionBuilder';
import cors from'cors'       
const app = express();
// json is the default content-type for POST requests
app.use(express.json());
app.use(cors())
// get version
app.get('/version', (req, res) => {
  res.send({ version: '1.0.0' });
});

app.get('/listCollections', restrictedRequest(["ADMIN"]),async (req, res) => {
  const { path } = req.query;
  if (path) {
    db.doc(decodeURIComponent(path as string)).listCollections().then(collections => {
      
      res.send(collections.map(collection => collection.id));
    });
  } else {
    db.listCollections().then(collections => {
      res.send(collections.map(collection => collection.id));
    });
  }
});


// USER MANAGEMENT

// invite users
app.post('/inviteUser',restrictedRequest(["ADMIN"]),
inviteUser)

//set user roles
app.post('/setUserRoles',restrictedRequest(["ADMIN"]),
setUserRoles)

// delete user
app.delete('/deleteUser',restrictedRequest(["ADMIN"]),
deleteUser)

// impersonate user
app.get('/impersonateUser/:email',restrictedRequest(["ADMIN"]),
impersonateUser)


// Function Builder
app.post('/createFunction',restrictedRequest(["ADMIN"]),
functionBuilder)

//SECRET MANAGEMENT

// get secret




const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`rowyRun: listening on port ${port}`);
});



// Exports for testing purposes.
module.exports = app;
