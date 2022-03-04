import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getProjectId } from "./metadataService";
const client = new SecretManagerServiceClient();

export async function listSecrets() {
  const projectId = await getProjectId();
  const [secrets] = await client.listSecrets({
    parent: "projects/" + projectId,
  });
  return secrets.map((secret) => {
    return secret.name.split("/").pop();
  });
}
