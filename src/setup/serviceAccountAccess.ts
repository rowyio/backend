import {google} from 'googleapis'

import { Request,Response } from "express";
export const serviceAccountAccess =  async (req:Request, res:Response) => {
    const auth = new google.auth.GoogleAuth();
    const scopes =  auth.defaultScopes
    return scopes
}