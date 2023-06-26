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

export async function addSecret(name: string, value: string) {
  const projectId = await getProjectId();

  let hasSecret = false;
  try {
    const [existingSecret] = await client.getSecret({
      name: `projects/${projectId}/secrets/${name}`,
    });
    hasSecret = true;
  } catch (e: any) {
    console.log("secrets.getSecret:", e.name, e.message);
    throw e;
  }

  if (hasSecret) {
    console.log("hasSecret, skipped createSecret");
  } else {
    console.log("secrets.createSecret");
    await client.createSecret({
      parent: `projects/${projectId}`,
      secretId: name,
      secret: {
        name,
        replication: {
          automatic: {},
        },
      },
    });
  }

  console.log("secrets.addSecretVersion");
  const [version] = await client.addSecretVersion({
    parent: `projects/${projectId}/secrets/${name}`,
    payload: {
      data: Buffer.from(value, "utf8"),
    },
  });

  console.log(
    "secrets.enableSecretVersion, version:",
    version.name,
    JSON.stringify(version)
  );
  await client.enableSecretVersion({
    name: version.name,
  });
}

export async function editSecret(name: string, value: string) {
  const projectId = await getProjectId();

  let hasSecret = false;
  try {
    const [existingSecret] = await client.getSecret({
      name: `projects/${projectId}/secrets/${name}`,
    });
    hasSecret = true;
  } catch (e: any) {
    console.log("secrets.getSecret:", e.name, e.message);
    throw e;
  }

  if (hasSecret) {
    console.log("hasSecret true");
  } else {
    console.log(`Secret ${name} does not exist`);
    throw new Error(`Secret ${name} does not exist`);
  }

  console.log("secrets.addSecretVersion");
  const [version] = await client.addSecretVersion({
    parent: `projects/${projectId}/secrets/${name}`,
    payload: {
      data: Buffer.from(value, "utf8"),
    },
  });

  console.log(
    "secrets.enableSecretVersion, version:",
    version.name,
    JSON.stringify(version)
  );
  await client.enableSecretVersion({
    name: version.name,
  });
}

export async function deleteSecret(name: string) {
  const projectId = await getProjectId();

  let hasSecret = false;
  try {
    const [existingSecret] = await client.getSecret({
      name: `projects/${projectId}/secrets/${name}`,
    });
    hasSecret = true;
  } catch (e: any) {
    console.log("secrets.getSecret:", e.name, e.message);
    throw e;
  }

  if (hasSecret) {
    console.log("hasSecret true");
  } else {
    console.log(`Secret ${name} does not exist`);
    throw new Error(`Secret ${name} does not exist`);
  }

  const res = await client.deleteSecret({
    name: `projects/${projectId}/secrets/${name}`,
  });
}
