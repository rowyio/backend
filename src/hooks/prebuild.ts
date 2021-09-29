import { updateConfig, getProjectId } from "./utils";
import { db } from "../firebaseConfig";
import { logError } from "./createRowyApp";
import { asyncExecute } from "../functionBuilder/compiler/terminal";

async function start() {
  const projectId = getProjectId();

  if (!projectId) {
    throw new Error("GOOGLE_CLOUD_PROJECT env variable is not set");
  }
  asyncExecute(
    "gcloud services list --project rowy-service",
    (error, stdout, stderr) => {
      /*
    example output:
    appengine.googleapis.com                App Engine Admin API
bigquery.googleapis.com                 BigQuery API
bigquerydatatransfer.googleapis.com     BigQuery Data Transfer API
    */
      // get the services list urls

      const services = stdout.split("\n");
      const servicesUrls = services.map((service) => {
        return service.split(" ")[0];
      });
      if (!servicesUrls.includes("firestore.googleapis.com")) {
        console.log("Missing Firestore");
      }
    }
  );
  try {
    updateConfig("projectId", projectId);
    updateConfig("region", process.env.GOOGLE_CLOUD_REGION);
    const settings = {
      rowyRunBuildStatus: "BUILDING",
      rowyRunRegion: process.env.GOOGLE_CLOUD_REGION,
    };
    await db.doc("_rowy_/settings").set(settings, { merge: true });
    const publicSettings = {
      signInOptions: ["google"],
    };
    await db.doc("_rowy_/publicSettings").set(publicSettings, { merge: true });
  } catch (error) {
    await logError({
      event: "pre-build",
      error,
    });
    throw new Error(`Rowy deployment failed: ${JSON.stringify(error)}`);
  }
}

start();
