import { db, auth, storage } from "../firebaseConfig";
import { Request, Response } from "express";
import { User } from "../types/User";
import fetch from "node-fetch";
import { DocumentReference } from "firebase-admin/firestore";
import rowy, { Rowy } from "./rowy";
import { Auth } from "firebase-admin/auth";
import * as admin from "firebase-admin";
import { installDependenciesIfMissing } from "../utils";
import { telemetryRuntimeDependencyPerformance } from "../rowyService";
import { LoggingFactory, RowyLogging } from "../logging";
import { transpile } from "../functionBuilder/utils";

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
  storage: admin.storage.Storage;
  logging: RowyLogging;
  tableSchema: any;
};

type Connector = (args: ConnectorArgs) => Promise<any[]> | any[];

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
    const functionStartTime = Date.now();
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
    const { connectorFn } = config;
    const importHeader = `import rowy from "./rowy";\n import fetch from "node-fetch";\n`;

    const connectorFnBody = transpile(
      importHeader,
      connectorFn,
      undefined,
      "connectorFn"
    );

    const { yarnStartTime, yarnFinishTime, dependenciesString } =
      await installDependenciesIfMissing(
        connectorFnBody,
        `connector ${columnKey} in ${rowDocPath}`
      );

    const logging = await LoggingFactory.createConnectorLogging(
      columnKey,
      schemaDoc.ref.id,
      rowDocPath
    );

    const connectorScript = eval(connectorFnBody) as Connector;
    const pattern = /row(?!y)/;
    const functionUsesRow = pattern.test(connectorFnBody);
    const rowSnapshot =
      functionUsesRow && rowDocPath
        ? (await db.doc(rowDocPath).get()).data()
        : null;
    const results = await connectorScript({
      row: rowSnapshot,
      ref: rowDocPath ? db.doc(rowDocPath) : null,
      query,
      db,
      auth,
      fetch,
      user,
      storage,
      rowy,
      logging,
      tableSchema: schemaDocData,
    });

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
