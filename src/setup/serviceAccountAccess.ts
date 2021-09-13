import {google} from 'googleapis'

import { Request,Response } from "express";
export const serviceAccountAccess =  async (req:Request, res:Response) => {
    try {
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
        });
        const scopes = auth.defaultScopes
        return res.send({scopes})
    } catch (error) {
        return res.send({error})
    }
}