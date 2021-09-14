
import { db, admin } from '../firebaseConfig'
import { Request, Response } from 'express';
export const listCollections =async (req: Request) => {
  const { path } = req.query;
  if (path) {
    const collections = await db.doc(decodeURIComponent(path as string)).listCollections()
    return collections.map(collection => collection.id)
    
  } else {
   const collections = await db.listCollections()
    return collections.map(collection => collection.id)
  }
}


export const getFirestoreRules = async () => {
  const securityRules = admin.securityRules()
  const firestoreRules = await securityRules.getFirestoreRuleset()
  return firestoreRules
}
