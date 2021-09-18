import { Request, Response } from "express";
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "http://metadata.google.internal/",
  timeout: 1000,
  headers: { "Metadata-Flavor": "Google" },
});

export const metadataService = (req: Request, res: Response) => {
  let path =
    req.query.path ||
    "computeMetadata/v1/instance/service-accounts/default/scopes";
  axiosInstance.get(path as string).then((response) => {
    res.send({ data: response.data });
  });
};

export const getProjectId = async () =>
  (await axiosInstance.get("computeMetadata/v1/project/project-id")).data;
export const getNumericProjectId = async () =>
  (await axiosInstance.get("computeMetadata/v1/project/numeric-project-id"))
    .data;
export const generateServiceAccessToken = async (audience) =>
  (
    await axiosInstance.get(
      `computeMetadata/v1/instance/service-accounts/default/identity?audience=${audience}`
    )
  ).data;
//https://www.googleapis.com/oauth2/v1/certs
