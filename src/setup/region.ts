
import { Request,Response } from "express";
import {db} from '../firebaseConfig'
export const region =  async (req:Request, res:Response) => {
    const settings = await db.doc('_rowy_/settings').get()
    const {rowyRunRegion} = settings.data()
    res.send({ 
    region: rowyRunRegion
    });
  }