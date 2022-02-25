import { SecretManagerServiceClient } from "@google-cloud/secret-manager";
const client = new SecretManagerServiceClient();

export async function listSecrets() {
  const [secrets] = await client.listSecrets();
  secrets.map((secret) => {
    return secret.name;
  });
}
