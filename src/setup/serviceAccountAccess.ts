import { Request,Response } from "express";

import fetch from 'node-fetch';
export const serviceAccountAccess =  async (req:Request, res:Response) => {

    const url = req.body.url;
    try {
        // VM instance metadata service account
        //`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email` 
        const response = await fetch(url??`http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email`,{
        method: 'get',
        headers:  {'Metadata-Flavor': 'Google'}
        });
        return res.send({response})
    } catch (error) {
        return res.send({error})
    }
}