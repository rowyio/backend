import { db } from "../firebaseConfig";
import { Request } from "express";
import { securityRules } from "firebase-admin";

export const listCollections = async (req: Request) => {
  const { path } = req.query;
  if (path) {
    const collections = await db
      .doc(decodeURIComponent(path as string))
      .listCollections();
    return collections.map((collection) => collection.id);
  } else {
    const collections = await db.listCollections();
    return collections
      .map((collection) => collection.id)
      .filter((id) => id !== "_rowy_");
  }
};

export const getFirestoreRules = async () => {
  const firestoreRules = await securityRules().getFirestoreRuleset();
  return firestoreRules;
};

export const setFirestoreRules = async (req: Request) => {
  const { ruleset } = req.body;
  console.log(ruleset);
  if (!ruleset) throw new Error("No ruleset Provided");
  const resp = await securityRules().releaseFirestoreRulesetFromSource(ruleset);
  return {
    success: true,
    resp,
    message: "Firestore rules has been successfully updated",
  };
};

export const createCompositeIndex = async (req: Request) => {};
