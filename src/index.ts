// --resolveJsonModule 
import express from 'express'
import { db } from './firebaseConfig'
import { hasRoles } from './utils'
import { deleteUser, impersonateUser, inviteUser, setUserRoles } from './userManagement';
import { listCollections } from './firestore';
import { actionScript } from './actionScripts';
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

app.get('/listCollections', hasRoles(["ADMIN"]),
listCollections);



// USER MANAGEMENT

// invite users
app.post('/inviteUser',hasRoles(["ADMIN"]),
inviteUser)

//set user roles
app.post('/setUserRoles',hasRoles(["ADMIN"]),
setUserRoles)

// delete user
app.delete('/deleteUser',hasRoles(["ADMIN"]),
deleteUser)

// impersonate user
app.get('/impersonateUser/:email',hasRoles(["ADMIN"]),
impersonateUser)


// action script
app.post('/actionScript',hasRoles(["ADMIN"]),actionScript)
// Function Builder
app.post('/buildFunction',hasRoles(["ADMIN"]),
functionBuilder)

//SECRET MANAGEMENT

// get secret




const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`rowyRun: listening on port ${port}`);
});



// Exports for testing purposes.
module.exports = app;
