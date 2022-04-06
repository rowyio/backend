import _get from "lodash/get";
import { db, auth } from "../firebaseConfig";
import { Request, Response } from "express";
import { User } from "../types/User";
import fetch from "node-fetch";
import { DocumentReference } from "firebase-admin/firestore";
import rowy from "./rowy";

type RequestData = {
  refs?: DocumentReference[]; // used in bulkAction
  ref?: DocumentReference;
  schemaDocPath: string;
  columnKey: string;
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

export const evaluateDerivative = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const userRoles = user.roles;
    if (!userRoles || userRoles.length === 0)
      throw new Error("User has no assigned roles");
    const { refs, ref, schemaDocPath, columnKey }: RequestData = req.body;
    const schemaDoc = await db.doc(schemaDocPath).get();
    const schemaDocData = schemaDoc.data();
    if (!schemaDocData) {
      return res.send({
        success: false,
        message: "no schema found",
      });
    }
    const config = schemaDocData.columns[columnKey].config;
    const { derivativeFn, script } = config;
    const code =
      derivativeFn ??
      `{
      ${script}
    }`;
    const derivativeFunction = eval(
      `async({row,db,ref,auth,fetch,rowy})=>` + code.replace(/^.*=>/, "")
    );
    const getRows = refs
      ? refs.map(async (r) => db.doc(r.path).get())
      : [db.doc(ref.path).get()];
    const rowSnapshots = await Promise.all(getRows);
    const tasks = rowSnapshots.map(async (doc) => {
      try {
        const row = doc.data();
        const result: any = await derivativeFunction({
          row: row,
          db,
          auth,
          ref: doc.ref,
          fetch,
          rowy,
        });
        const update = { [columnKey]: result };
        if (schemaDocData?.audit !== false) {
          update[
            (schemaDocData?.auditFieldUpdatedBy as string) || "_updatedBy"
          ] = authUser2rowyUser(user!, { updatedField: columnKey });
        }
        await db.doc(ref.path).update(update);
        return {
          success: true,
        };
      } catch (error: any) {
        return {
          success: false,
          error,
          message: error.message,
        };
      }
    });
    const results = await Promise.all(tasks);
    if (results.length === 1) {
      return res.send(results[0]);
    }
    return res.send(results);
  } catch (error: any) {
    return res.send({
      success: false,
      error,
      message: error.message,
    });
  }
};
