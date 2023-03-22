import { Request } from "express";
import axios from "axios";
import { getProjectId } from "../metadataService";

export const triggerJob = async (req: Request) => {
  const { jobName, region } = req.body;

  try {
    const projectId = await getProjectId();
    // fetch access token https://cloud.google.com/compute/docs/access/create-enable-service-accounts-for-instances#applications
    const tokenRes = await axios(
      `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token`,
      {
        method: "get",
        headers: {
          "Metadata-Flavor": `Google`,
        },
      }
    );
    console.log(
      `tokenRes status ${tokenRes.status} ${tokenRes.statusText} ${tokenRes.data.token_type} ${tokenRes.data.access_token}`
    );
    console.log(JSON.stringify(tokenRes.data));
    const res = await axios(
      `https://${
        region ?? "us-central1"
      }-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${projectId}/jobs/${jobName}:run`,
      {
        method: "post",
        headers: {
          Authorization: `${tokenRes.data.token_type} ${tokenRes.data.access_token}`,
        },
      }
    );
    console.log(`status ${res.status} ${res.statusText}`);
    return {
      success: 200 <= res.status && res.status < 300,
      message: `status ${res.status} ${res.statusText}`,
    };
  } catch (e: any) {
    console.error("Error triggering job", e);
    return {
      success: false,
      error: e.message,
    };
  }
};
