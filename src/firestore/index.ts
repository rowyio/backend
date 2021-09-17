import { db, admin } from "../firebaseConfig";
import { Request } from "express";
export const listCollections = async (req: Request) => {
  const { path } = req.query;
  if (path) {
    const collections = await db
      .doc(decodeURIComponent(path as string))
      .listCollections();
    return collections.map((collection) => collection.id);
  } else {
    const collections = await db.listCollections();
    return collections.map((collection) => collection.id);
  }
};

export const getFirestoreRules = async () => {
  const securityRules = admin.securityRules();
  const firestoreRules = await securityRules.getFirestoreRuleset();
  return firestoreRules;
};

export const setFirestoreRules = async (req: Request) => {
  const { ruleset } = req.body;
  console.log(ruleset);
  if (!ruleset) throw new Error("No ruleset Provided");
  const securityRules = admin.securityRules();
  // const rs = await admin.securityRules().createRuleset(ruleset);
  const resp = await securityRules.releaseFirestoreRulesetFromSource(ruleset);
  return {
    success: true,
    resp,
    message: "Firestore rules has been successfully updated",
  };
};
