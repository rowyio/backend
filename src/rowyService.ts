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
export const telemetry = async (event, token) => {
  if (!projectId) {
    projectId = await getProjectId();
  }
  const body = {
    projectId,
    event,
    source: meta.name,
  };
  if (token) {
    body["user"] = {
      email: token.email ?? "",
      name: token.name ?? "",
      uid: token.uid ?? "",
    };
  }
  return telemetryInstance.post(`monitor`, body);
};
export const telemetryError = async (event, token, error) => {
  if (!projectId) {
    projectId = await getProjectId();
  }
  const body = {
    projectId,
    event,
    source: meta.name,
    error: JSON.stringify(error),
  };
  if (token) {
    body["user"] = {
      email: token.email ?? "",
      name: token.name ?? "",
      uid: token.uid ?? "",
    };
  }
  console.log("error", body);
  return telemetryInstance.post(`error`, body);
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
