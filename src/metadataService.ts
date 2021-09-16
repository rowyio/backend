import { Request, Response } from "express";
const axios = require("axios");

const axiosInstance = axios.create({
  baseURL: "http://metadata.google.internal/",
  timeout: 1000,
  headers: { "Metadata-Flavor": "Google" },
});

export const metadataService = (req: Request, res: Response) => {
  let path =
    req.query.path ||
    "computeMetadata/v1/instance/service-accounts/default/scopes";
  axiosInstance.get(path).then((response) => {
    res.send({ data: response.data });
  });
};
