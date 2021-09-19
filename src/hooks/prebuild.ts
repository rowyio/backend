import { updateConfig, getProjectId } from "./utils";
import { db } from "../firebaseConfig";

async function start() {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT env variable is not set");
  }
  updateConfig("projectId", projectId);
  const settings = {
    rowyRunBuildStatus: "BUILDING",
    rowyRunRegion: process.env.GOOGLE_CLOUD_REGION,
  };
  await db.doc("_rowy_/settings").set(settings, { merge: true });
  const publicSettings = {
    signInOptions: ["google"],
  };
  await db.doc("_rowy_/publicSettings").set(publicSettings, { merge: true });
}

start();
