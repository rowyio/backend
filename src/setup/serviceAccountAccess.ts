import { Request,Response } from "express";

const axios = require('axios');

const axiosInstance = axios.create({
    baseURL: 'http://metadata.google.internal/',
    timeout: 1000,
    headers: {'Metadata-Flavor': 'Google'}
  });
  
export const serviceAccountAccess = (req:Request, res:Response) => {
    try {
        // let path = req.query.path || 'computeMetadata/v1/project/project-id';
        // axiosInstance.get(path).then(response => {
        //   console.log(response.status)
        //   console.log(response.data);
        //   res.send(response.data);
        // });
    } catch (error) {
        res.send({error})
    }
}