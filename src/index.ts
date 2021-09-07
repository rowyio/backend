// --resolveJsonModule 
import express from 'express'
import { db } from './firebaseConfig'
import { restrictedRequest } from './utils'
import { deleteUser, impersonateUser, inviteUser, setUserRoles } from './userManagement';
const app = express();
// json is the default content-type for POST requests
app.use(express.json());

// get version
app.get('/version', (req, res) => {
  res.send({ version: '1.0.0', date: '2021-09-5' });
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
app.post('/impersonateUser',restrictedRequest(["ADMIN"]),
impersonateUser)


//SECRET MANAGEMENT

// get secret




const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`rowyRun: listening on port ${port}`);
});



// Exports for testing purposes.
module.exports = app;
