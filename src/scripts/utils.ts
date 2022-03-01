import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
import { getProjectId, getServiceAccountEmail } from "../metadataService";

const secrets = new SecretManagerServiceClient();

export const getSecret = async (name: string, v: string = "latest") => {
  const projectId = await getProjectId();
  const [version] = await secrets.accessSecretVersion({
    name: `projects/${projectId}/secrets/${name}/versions/${v}`,
  });
  const payload = version.payload?.data?.toString();
  if (payload && payload[0] === "{") {
    return JSON.parse(payload);
  } else {
    return payload;
  }
};

export const getServiceAccountUser = async () => {
  const serviceAccountEmail = await getServiceAccountEmail();
  return {
    email: serviceAccountEmail,
    emailVerified: true,
    displayName: "Rowy Hooks",
    photoURL: "https://github.com/rowyio/rowyrun/raw/main/icon.png",
    uid: `serviceAccount:` + serviceAccountEmail,
    timestamp: new Date().getTime(),
  };
};
