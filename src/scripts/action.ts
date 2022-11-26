import _get from "lodash/get";
import { db, auth } from "../firebaseConfig";
import { Request, Response } from "express";
import { User } from "../types/User";
import fetch from "node-fetch";
import { FieldValue } from "firebase-admin/firestore";
import rowy from "./rowy";
import { installDependenciesIfMissing } from "../utils";
import { telemetryRuntimeDependencyPerformance } from "../rowyService";
import { LoggingFactory } from "../logging";

type Ref = {
  id: string;
  path: string;
  parentId: string;
  tablePath: string;
};
type ActionData = {
  refs?: Ref[]; // used in bulkAction
  ref?: Ref;
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
    const functionStartTime = Date.now();
    const user = res.locals.user;
    const userRoles = user.roles;
    if (!userRoles || userRoles.length === 0)
      throw new Error("User has no assigned roles");
    const {
      refs,
      ref,
      actionParams,
      column,
      action,
      schemaDocPath,
    }: ActionData = req.body;
    const schemaDoc = await db.doc(schemaDocPath).get();
    const schemaDocData = schemaDoc.data();
    if (!schemaDocData) {
      return res.send({
        success: false,
        message: "no schema found",
      });
    }
    const config = schemaDocData.columns[column.key].config;
    const { script, requiredRoles, requiredFields, runFn, undoFn } = config;
    const runFunctionBody = runFn
      ? runFn.replace(/^.*=>/, "")
      : `{\n${script}\n}`;
    const undoFunctionBody = undoFn
      ? undoFn.replace(/^.*=>/, "")
      : `{\n${_get(config, "undo.script")}\n}`;
    if (!requiredRoles || requiredRoles.length === 0) {
      throw Error(`You need to specify at least one role to run this script`);
    }
    if (!requiredRoles.some((role) => userRoles.includes(role))) {
      throw Error(`You don't have the required roles permissions`);
    }
    const codeToRun = action === "undo" ? undoFunctionBody : runFunctionBody;

    const { yarnStartTime, yarnFinishTime, dependenciesString } =
      await installDependenciesIfMissing(
        codeToRun,
        `action ${column.key} in ${ref.path}`
      );

    const logging = await LoggingFactory.createActionLogging(
      column.key,
      ref.id
    );

    const _actionScript = eval(
      `async ({ row, db, ref, auth, utilFns, actionParams, user, fetch, rowy, tableSchema, logging }) => ${codeToRun}`
    );
    const getRows = refs
      ? refs.map(async (r) => db.doc(r.path).get())
      : [db.doc(ref.path).get()];
    const rowSnapshots = await Promise.all(getRows);
    const tasks = rowSnapshots.map(async (doc) => {
      try {
        const row = doc.data();
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
          row: row,
          db,
          auth,
          ref: doc.ref,
          actionParams,
          user: { ...authUser2rowyUser(user), roles: userRoles },
          fetch,
          rowy,
          tableSchema: schemaDocData,
          logging,
        });
        if (result.success || result.status) {
          const cellValue = {
            status: result.status,
            completedAt: FieldValue.serverTimestamp(),
            ranBy: user.email,
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
          return {
            ...result,
          };
        } else
          return {
            success: false,
            message: result.message,
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

    const functionEndTime = Date.now();
    try {
      await telemetryRuntimeDependencyPerformance({
        functionStartTime,
        functionEndTime,
        yarnStartTime,
        yarnFinishTime,
        dependenciesString,
      });
    } catch (e) {}

    return res.send(results);
  } catch (error: any) {
    return res.send({
      success: false,
      error,
      message: error.message,
    });
  }
};
