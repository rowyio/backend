import axios from "axios";
import { generateServiceAccessToken, getProjectId } from "./metadataService";

const meta = require("../package.json");

const getAxiosInstance = async () => {
  const baseURL = "https://rowy.run/";
  const authToken = await generateServiceAccessToken(baseURL);
  return axios.create({
    baseURL,
    timeout: 1000,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + authToken,
    },
  });
};

export const getExtension = async (
  extensionId: string
): Promise<{
  dependencies: { [key: string]: string };
  extension: string;
  syncScript?: string;
}> => {
  const axiosInstance = await getAxiosInstance();
  return (await axiosInstance.get(`extensions/${extensionId}`)).data;
};

let projectId;

const telemetryInstance = axios.create({
  baseURL: "https://rowy.events/",
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
  },
});
export const telemetry = async (event) => {
  if (!projectId) {
    projectId = await getProjectId();
  }
  const body = {
    projectId,
    event,
    source: meta.name,
  };
  return telemetryInstance.post(`monitor`, body);
};

export const telemetryError = async (event, error) => {
  if (!projectId) {
    projectId = await getProjectId();
  }
  const body = {
    projectId,
    event,
    source: meta.name,
    error: JSON.stringify(error),
  };
  console.log("error", body);
  return telemetryInstance.post(`error`, body);
};

export const telemetryRuntimeDependencyPerformance = async ({
  functionStartTime,
  functionEndTime,
  yarnStartTime,
  yarnFinishTime,
  dependenciesString,
}) => {
  if (!projectId) {
    projectId = await getProjectId();
  }
  const body = {
    projectId,
    source: meta.name,
    functionStartTime,
    functionEndTime,
    yarnStartTime,
    yarnFinishTime,
    dependenciesString,
  };
  return telemetryInstance.post(`runtime-dependency-performance`, body);
};

export const inviteUserService = async (
  projectId: string,
  newUser: {
    email: string;
    uid: string;
    roles: string[];
  },
  inviter: {
    email: string;
    uid: string;
    name: string;
  }
): Promise<{
  dependencies: { [key: string]: string };
  extension: string;
  syncScript?: string;
}> => {
  const axiosInstance = await getAxiosInstance();
  return (
    await axiosInstance.post(`inviteUser`, {
      projectId,
      newUser,
      inviter,
    })
  ).data;
};
