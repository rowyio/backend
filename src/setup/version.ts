import { Request, Response } from "express";
const meta = require("../../package.json");
export const version = async (req: Request, res: Response) => {
  res.send({ version: meta.version });
};
