import express from "express";
import cors from "cors";
import { hasAnyRole, requireAuth } from "./middleware/auth";
import {
  deleteUser,
  impersonateUser,
  inviteUser,
  setUserRoles,
} from "./userManagement";
import {
  getFirestoreRules,
  listCollections,
  setFirestoreRules,
} from "./firestore";
import { actionScript } from "./actionScripts";
import { functionBuilder } from "./functionBuilder";
import {
  version,
  region,
  serviceAccountAccess,
  setOwnerRoles,
  getOwner,
} from "./setup";
import { checkIfFTMigrationRequired, migrateFT2Rowy } from "./setup/ft2rowy";
import firebase from "firebase-admin";
import { db } from "./firebaseConfig";
import { getAlgoliaSearchKey } from "./connectTable/algolia";

import { metadataService, getProjectId } from "./metadataService";
const app = express();
// json is the default content-type for POST requests
app.use(express.json());

app.use(cors());

app.get("/", async (req, res) => {
  const projectId = await getProjectId();
  try {
    const settingsDoc = await db.doc(`_rowy_/settings`).get();
    const rowyRunUrl = settingsDoc.get("rowyRunUrl");
    const setupCompleted = settingsDoc.get("setupCompleted");
    if (setupCompleted) {
      res.send(`Rowy Run is setup successfully`);
    } else {
      res.redirect(
        `https://${projectId}.rowy.app/setup?rowyRunUrl=${rowyRunUrl}`
      );
    }
  } catch (error) {
    res.redirect(`https://${projectId}.rowy.app/setup`);
  }
});
const functionWrapper = (fn) => async (req, res) => {
  try {
    const user: firebase.auth.UserRecord = res.locals.user;
    const data = await fn(req, user);
    res.status(200).send(data);
  } catch (error) {
    res.status(500).send(error);
  }
};
// rowy Run Setup
// get version
app.get("/version", functionWrapper(version));
app.get("/region", functionWrapper(region));

app.get("/serviceAccountAccess", serviceAccountAccess);
app.get("/projectOwner", functionWrapper(getOwner));

app.get("/setOwnerRoles", requireAuth, setOwnerRoles);

app.get(
  "/listCollections",
  requireAuth,
  hasAnyRole(["ADMIN"]),
  functionWrapper(listCollections)
);

app.get(
  "/firestoreRules",
  requireAuth,
  hasAnyRole(["ADMIN", "OWNER"]),
  functionWrapper(getFirestoreRules)
);

app.post(
  "/setFirestoreRules",
  requireAuth,
  hasAnyRole(["ADMIN", "OWNER"]),
  functionWrapper(setFirestoreRules)
);

//FT Migration

app.get(
  "/checkFT2Rowy",
  requireAuth,
  hasAnyRole(["ADMIN", "OWNER"]),
  checkIfFTMigrationRequired
);
app.get(
  "/migrateFT2Rowy",
  requireAuth,
  hasAnyRole(["ADMIN", "OWNER"]),
  functionWrapper(migrateFT2Rowy)
);

// USER MANAGEMENT

// invite users
app.post("/inviteUser", requireAuth, hasAnyRole(["ADMIN"]), inviteUser);

//set user roles
app.post("/setUserRoles", requireAuth, hasAnyRole(["ADMIN"]), setUserRoles);

// delete user
app.delete("/deleteUser", requireAuth, hasAnyRole(["ADMIN"]), deleteUser);

// impersonate user
app.get(
  "/impersonateUser/:email",
  requireAuth,
  hasAnyRole(["ADMIN"]),
  impersonateUser
);
// action script
app.post("/actionScript", requireAuth, actionScript);
// Function Builder
app.post(
  "/buildFunction",
  requireAuth,
  hasAnyRole(["ADMIN"]),
  functionWrapper(functionBuilder)
);

//metadata service
app.get("/metadata", requireAuth, hasAnyRole(["ADMIN"]), metadataService);

// get algoia search key
app.get(
  "/algoliaSearchKey/:index",
  requireAuth,
  functionWrapper(getAlgoliaSearchKey)
);

app.get(
  "/algoliaAppId",
  requireAuth,
  functionWrapper(() => {
    if (process.env.ALGOLIA_APPLICATION_ID) {
      return { appId: process.env.ALGOLIA_APPLICATION_ID, success: true };
    } else {
      return { success: false, message: "Algolia is not setup" };
    }
  })
);
//SECRET MANAGEMENT
// get secret

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`rowyRun: listening on port ${port}`);
});

// Exports for testing purposes.
module.exports = app;
