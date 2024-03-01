import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";

if (process.env.LOCAL) {
  const serviceAccount = require("../firebase-adminsdk.json");
  initializeApp({
    credential: cert(serviceAccount),
  });
} else {
  initializeApp();
}
// Initialize Cloud Firestore Database
export const db = getFirestore();
// Initialize Auth
export const auth = getAuth();
// Initialize Storage
export const storage = getStorage();
const settings = {
  ignoreUndefinedProperties: true,
};
db.settings(settings);
