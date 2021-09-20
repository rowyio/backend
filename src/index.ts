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

import { metadataService } from "./metadataService";
const app = express();
// json is the default content-type for POST requests
app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "UPDATE", "PUT", "PATCH"],
  })
);
const functionWrapper = (fn) => async (req, res) => {
  try {
    const data = await fn(req);
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
app.post("/buildFunction", requireAuth, hasAnyRole(["ADMIN"]), functionBuilder);

//metadata service
app.get("/metadata", requireAuth, hasAnyRole(["ADMIN"]), metadataService);
//SECRET MANAGEMENT

// get secret

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`rowyRun: listening on port ${port}`);
});

// Exports for testing purposes.
module.exports = app;
