
import {db} from '../firebaseConfig'
import { Request,Response } from 'express';
export const listCollections = async (req:Request, res:Response) => {
        const { path } = req.query;
        if (path) {
          db.doc(decodeURIComponent(path as string)).listCollections().then(collections => {
            
            res.send(collections.map(collection => collection.id));
          });
        } else {
          db.listCollections().then(collections => {
            res.send(collections.map(collection => collection.id));
          });
        }
      }