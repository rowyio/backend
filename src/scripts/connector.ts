import _get from "lodash/get";
import { db, auth } from "../firebaseConfig";
import { Request, Response } from "express";
import { User } from "../types/User";
import fetch from "node-fetch";
import { DocumentReference, FieldValue } from "firebase-admin/firestore";
import rowy, { Rowy } from "./rowy";
import { Auth } from "firebase-admin/auth";

type ConnectorRequest = {
  rowDocPath: string;
  columnKey: string;
  schemaDocPath: string;
  query: string;
};
type ConnectorArgs = {
  ref: DocumentReference;
  query: string;
  row: any;
  db: FirebaseFirestore.Firestore;
  auth: Auth;
  user: User;
  rowy: Rowy;
  fetch: any;
};

type Connector = (args: ConnectorArgs) => Promise<any[]> | any[];

const missingFieldsReducer = (data: any) => (acc: string[], curr: string) => {
  if (data[curr] === undefined) {
    return [...acc, curr];
  } else return acc;
};

export const authUser2rowyUser = (currentUser: User, data?: any) => {
  const { name, email, uid, email_verified, picture } = currentUser;
  return {
    timestamp: new Date(),
    displayName: name,
    email,
    uid,
    emailVerified: email_verified,
    photoURL: picture,
    ...data,
  };
};
// TODO convert to schema publisher/subscriber
export const connector = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const userRoles = user.roles;
    if (!userRoles || userRoles.length === 0)
      throw new Error("User has no assigned roles");
    const { rowDocPath, query, columnKey, schemaDocPath }: ConnectorRequest =
      req.body;
    const schemaDoc = await db.doc(schemaDocPath).get();
    const schemaDocData = schemaDoc.data();
    if (!schemaDocData) {
      return res.send({
        success: false,
        message: "no schema found",
      });
    }
    const config = schemaDocData.columns[columnKey].config;
    const { connectorFn, requiredRoles, requiredFields } = config;
    const connectorFnBody = connectorFn.replace(/^.*=>/, "");
    // TODO: Decide if roles are required
    // if (!requiredRoles.some((role) => userRoles.includes(role))) {
    //   throw Error(`You don't have the required roles permissions`);
    // }
    const connectorScript = eval(
      `async({row,db,ref,auth,fetch,rowy})=>` + connectorFnBody
    ) as Connector;
    const functionUsesRow = connectorFnBody.includes("row"); // add regex to make sure rowy is not captured
    const rowSnapshot = functionUsesRow
      ? (await db.doc(rowDocPath).get()).data()
      : null;
    const results = await connectorScript({
      row: rowSnapshot,
      ref: db.doc(rowDocPath),
      query,
      db,
      auth,
      fetch,
      user,
      rowy,
    });
    return res.send({
      success: true,
      hits: results,
    });
  } catch (error: any) {
    return res.send({
      success: false,
      error,
      message: error.message,
    });
  }
};
