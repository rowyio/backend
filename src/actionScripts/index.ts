import * as _ from "lodash";
import { db, auth } from "../firebaseConfig";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { User } from "../types/User";
//TODO
//import utilFns from "./utils";
type ActionData = {
  ref: {
    id: string;
    path: string;
    parentId: string;
    tablePath: string;
  };
  schemaDocPath?: string;
  column: any;
  action: "run" | "redo" | "undo";
  actionParams: any;
};

const missingFieldsReducer = (data: any) => (acc: string[], curr: string) => {
  if (data[curr] === undefined) {
    return [...acc, curr];
  } else return acc;
};

const serverTimestamp = admin.firestore.FieldValue.serverTimestamp;

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

export const actionScript = async (req: Request, res: Response) => {
  try {
    const user = res.locals.user;
    const userRoles = user.roles;
    if (!userRoles || userRoles.length === 0)
      throw new Error("User has no roles");
    const { ref, actionParams, column, action, schemaDocPath }: ActionData =
      req.body;
    const schemaDoc = await db.doc(schemaDocPath).get();
    const schemaDocData = schemaDoc.data();
    if (!schemaDocData) {
      return res.send({
        success: false,
        message: "no schema found",
      });
    }
    const config = schemaDocData.columns[column.key].config;
    const { script, requiredRoles, requiredFields } = config;
    if (!requiredRoles || requiredRoles.length === 0) {
      throw Error(`You need to specify at least one role to run this script`);
    }
    if (!requiredRoles.some((role) => userRoles.includes(role))) {
      throw Error(`You don't have the required roles permissions`);
    }
    const _actionScript = eval(
      `async({row,db, ref,auth,utilFns,actionParams,user})=>{${
        action === "undo" ? config["undo.script"] : script
      }}`
    );

    const [rowSnapshot] = await Promise.all([db.doc(ref.path).get()]);
    const row = rowSnapshot.data();
    const missingRequiredFields = requiredFields
      ? requiredFields.reduce(missingFieldsReducer(row), [])
      : [];
    if (missingRequiredFields.length > 0) {
      throw new Error(
        `Missing required fields:${missingRequiredFields.join(", ")}`
      );
    }
    const result: {
      message: string;
      status: string;
      success: boolean;
    } = await _actionScript({
      row,
      db,
      auth,
      ref: db.doc(ref.path),
      actionParams,
      user: authUser2rowyUser(user),
      admin,
    });
    if (result.success || result.status) {
      const cellValue = {
        redo: result.success ? config["redo.enabled"] : true,
        status: result.status,
        completedAt: serverTimestamp(),
        ranBy: user.email,
        undo: config["undo.enabled"],
      };
      try {
        const update = { [column.key]: cellValue };
        if (schemaDocData?.audit !== false) {
          update[
            (schemaDocData?.auditFieldUpdatedBy as string) || "_updatedBy"
          ] = authUser2rowyUser(user!, { updatedField: column.key });
        }
        await db.doc(ref.path).update(update);
      } catch (error) {
        // if actionScript code deletes the row, it will throw an error when updating the cell
        console.log(error);
      }
      return res.send({
        ...result,
      });
    } else
      return res.send({
        success: false,
        message: result.message,
      });
  } catch (error: any) {
    return res.send({
      success: false,
      error,
      message: error.message,
    });
  }
};
