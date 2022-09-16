import { db, auth } from "../firebaseConfig";
import { Request, Response } from "express";
import { User } from "../types/User";
import fetch from "node-fetch";
import { DocumentReference } from "firebase-admin/firestore";
import rowy from "./rowy";
import { getRequiredPackages } from "../utils";
import { asyncExecute } from "../terminalUtils";

type RequestData = {
  refs?: DocumentReference[]; // used in bulkAction
  ref?: DocumentReference;
  schemaDocPath: string;
  columnKey: string;
  collectionPath?: string;
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
    // only admin can evaluate derivative
    if (!userRoles.includes("ADMIN"))
      throw new Error("Authenticated User is not admin");
    const { refs, ref, schemaDocPath, columnKey, collectionPath }: RequestData =
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
    const { derivativeFn, script } = config;
    const code =
      derivativeFn ??
      `{
      ${script}
    }`;

    // Install dependencies
    const requiredDependencies = getRequiredPackages(code);
    const packageJson = require(`../../package.json`);
    const installedDependencies = Object.keys(packageJson.dependencies);
    const requiredDependenciesToInstall = requiredDependencies?.filter(
      (i) => !installedDependencies.includes(i.name)
    );
    const dependenciesString = requiredDependenciesToInstall.reduce(
      (acc, currDependency) => {
        return `${acc} ${currDependency.name}@${
          currDependency.version ?? "latest"
        }`;
      },
      ""
    );
    console.log(
      `Installing dependencies for derivative ${columnKey} in ${collectionPath}: ${dependenciesString}`
    );
    if (dependenciesString.trim().length >= 0) {
      const success = await asyncExecute(
        `cd ../..;yarn add ${dependenciesString}`
      );
      if (!success) {
        console.error("Dependencies could not be installed");
        return res.send({
          success: false,
          message: `Cannot install dependencies: ${dependenciesString}`,
        });
      }
      console.log("Dependencies installed successfully");
    }

    const derivativeFunction = eval(
      `async({row,db,ref,auth,fetch,rowy})=>` + code.replace(/^.*=>/, "")
    );
    let rowSnapshots: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>[] =
      [];
    if (collectionPath) {
      rowSnapshots = (await db.collection(collectionPath).get()).docs;
    } else {
      const getRows = refs
        ? refs.map(async (r) => db.doc(r.path).get())
        : [db.doc(ref.path).get()];
      rowSnapshots = await Promise.all(getRows);
    }
    const results = [];
    for (let i = 0; i < rowSnapshots.length; i += 300) {
      const chunk = rowSnapshots.slice(i, i + 300);
      const batch = db.batch();
      const batchResults = chunk.map(async (doc) => {
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
          await batch.update(doc.ref, update);
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
      results.push(...(await Promise.all(batchResults)));
      await batch.commit();
    }
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
