// --resolveJsonModule 
import express from 'express'
import {auth,db} from './firebaseConfig'
import {restrictedRequest} from './utils'
const app = express();
// json is the default content-type for POST requests
app.use(express.json());

// get version
app.get('/version', (req, res) => {
  res.send({version: '1.0.0', date: '2021-09-5'});
});


app.get('/users',restrictedRequest(['ADMIN']),async (req,res)=>{
  const {path} = req.query;
  if (path) {
    db.doc(path as string).listCollections().then(collections => {
      res.send(collections);
    });
  }else{
    db.listCollections().then(collections => {
      res.send(collections);
    });
  }  
});


// invite users
app.post('/inviteUser', async(req, res) => {
  const usersCollection = '_rowy_/userManagement/users'
  try {
    const {email,roles} = req.body;
    // check if user exists
    const userQuery = await db.collection(usersCollection).where('email', '==', email).get()
    if(userQuery.docs.length!==0){
      throw new Error('User already exists');
    }
    const user = await auth.getUserByEmail(email);
    if(!user){
      // create user
      const newUser = await auth.createUser({
        email,
        displayName: email,
        disabled: false
      });
      // roles
      auth.setCustomUserClaims(newUser.uid, {roles});
    }
    

    
   
  } catch (error:any) {
    res.send({error: error.message});
  }})




  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`rowyRun: listening on port ${port}`);
  });
  
  

// Exports for testing purposes.
module.exports = app;
