import axios from "axios";
import { generateServiceAccessToken } from "./metadataService";
const getAxiosInstance = async () => {
  const baseURL = "https://rowy.run/";
  const authToken = await generateServiceAccessToken(baseURL);
  return axios.create({
    baseURL: "https://rowy.run/",
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
