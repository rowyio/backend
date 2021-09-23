import { asyncExecute } from "../functionBuilder/compiler/terminal";
import { getProjectId } from "../metadataService";
export const updateRowyRun = async () => {
  const imageName = "rowy-run";
  const imageProjectId = "rowy-service";
  const projectId = await getProjectId();
  await asyncExecute(`gcloud config set project ${projectId}`, () => {
    console.log(`gcloud config set project ${projectId}`);
  });
  await asyncExecute(
    `gcloud run deploy ${imageName} --image gcr.io/${imageProjectId}/${imageName} --platform managed --allow-unauthenticated`,
    () => {
      console.log("gcloud run deploy");
    }
  );
};
