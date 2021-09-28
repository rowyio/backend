const client = require("firebase-tools");

import { httpsPost } from "../utils";
import { getGCPEmail } from "./utils";
const hostname = "rowy.run";
export const getRowyApp = (projectId: string) =>
  new Promise((resolve) => {
    const getSDKConfig = (appId: string) =>
      client.apps.sdkconfig("web", appId, { project: projectId });
    client.apps
      .list("WEB", { project: projectId })
      .then((data: { displayName: string; appId: string }[]) => {
        const filteredConfigs = data.filter(
          (config) => config.displayName === "rowyApp"
        );
        if (filteredConfigs.length === 0) {
          client.apps
            .create("WEB", "rowyApp", { project: projectId })
            .then((newApp: { appId: string }) => {
              getSDKConfig(newApp.appId).then((config: any) => {
                resolve(config.sdkConfig);
              });
            })
            .catch((err: any) => {
              console.error(err);
            });
        } else {
          getSDKConfig(filteredConfigs[0].appId).then((config: any) => {
            resolve(config.sdkConfig);
          });
        }
      })
      .catch((err: any) => {
        console.error(err);
      });
  });

export const registerRowyApp = async (body) =>
  httpsPost({
    hostname,
    path: `/createProject`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  });

export const logError = async (body) => {
  const ownerEmail = await getGCPEmail();
  return httpsPost({
    hostname,
    path: `/deploymentError`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: { projectId: process.env.GOOGLE_CLOUD_PROJECT, ownerEmail, ...body },
  });
};
