import { Request,Response } from "express";
import {db,auth,admin} from '../firebaseConfig'
  
export const serviceAccountAccess = async(req:Request, res:Response) => {
    try {
        const missingAccess:any = {

        }
       // test access to firestore
        try {
            db.listCollections()
        } catch (error) {
            missingAccess.firestore = error
        }
        // test access to auth
        try {
         const testUser =  await auth.createUser({
                email:"test@test.rowy"
           })
            await auth.deleteUser(testUser.uid)
        }
        catch (error) {
            missingAccess.auth = error
        }

        // test access to firestore rules
        try {
            const securityRules = admin.securityRules()
            securityRules.getFirestoreRuleset()
        } catch (error) {
            missingAccess.firestoreRules = error
        }

        res.send(missingAccess)
    } catch (error) {
        res.send({error})
    }
}