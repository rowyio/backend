
import { Request,Response } from "express";
export const version =  (req:Request, res:Response) => {
    res.send({ version: '1.0.0' });
  }