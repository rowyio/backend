// Initialize Firebase Admin
import * as functions from "firebase-functions";
import * as _admin from "firebase-admin";
_admin.initializeApp();

// Initialize Cloud Firestore Database
export const db = _admin.firestore();
// Initialize Auth
export const auth = _admin.auth();

// Initialize Storage
export const storage = _admin.storage();
export const admin = _admin;
const settings = {
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true,
};
db.settings(settings);
export const env = functions.config();
