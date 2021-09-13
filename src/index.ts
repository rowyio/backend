import express from 'express'
import { hasAnyRole,requireAuth } from './middleware/auth'
import { deleteUser, impersonateUser, inviteUser, setUserRoles } from './userManagement';
import { listCollections } from './firestore';
import { actionScript } from './actionScripts';
import { functionBuilder } from './functionBuilder';
import {version,region,serviceAccountAccess, setOwnerRoles} from './setup'
import cors from'cors'
const app = express();
// json is the default content-type for POST requests
app.use(express.json());
app.use(cors())


// rowy Run Setup
// get version
app.get('/version',version);
app.get('/region',region);

app.get('/serviceAccountAccess',serviceAccountAccess)

app.get('/setOwnerRoles',requireAuth,setOwnerRoles)

app.get('/listCollections', requireAuth,hasAnyRole(["ADMIN"]),
listCollections);



// USER MANAGEMENT

// invite users
app.post('/inviteUser',requireAuth,hasAnyRole(["ADMIN"]),
inviteUser)

//set user roles
app.post('/setUserRoles',requireAuth,hasAnyRole(["ADMIN"]),
setUserRoles)

// delete user
app.delete('/deleteUser',requireAuth,hasAnyRole(["ADMIN"]),
deleteUser)

// impersonate user
app.get('/impersonateUser/:email',requireAuth,hasAnyRole(["ADMIN"]),
impersonateUser)

// action script
app.post('/actionScript',requireAuth,hasAnyRole(["ADMIN"]),actionScript)
// Function Builder
app.post('/buildFunction',requireAuth,hasAnyRole(["ADMIN"]),
functionBuilder)

//SECRET MANAGEMENT

// get secret




const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`rowyRun: listening on port ${port}`);
});



// Exports for testing purposes.
module.exports = app;
