// Initialize Firebase Admin
import * as admin from "firebase-admin";

const credential =  process.env.GOOGLE_CLOUD_PROJECT? admin.credential.applicationDefault():admin.credential.cert(require(`../firebase-adminsdk.json`))
admin.initializeApp({
    credential
});
const db = admin.firestore();
const auth = admin.auth();

db.settings({ timestampsInSnapshots: true, ignoreUndefinedProperties: true });

export { db, admin, auth };
