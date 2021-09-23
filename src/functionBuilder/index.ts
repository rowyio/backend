import { asyncExecute } from "./compiler/terminal";
import {
  getCollectionType,
  getCollectionPath,
  getFunctionName,
  getTriggerPath,
  getSchemaPaths,
} from "./utils";
import generateConfig from "./compiler";
import { commandErrorHandler, createStreamLogger } from "./logger";
import firebase from "firebase-admin";
import { getProjectId } from "../metadataService";
import { db } from "../firebaseConfig";
let isBuilding = false;
export const functionBuilder = async (
  req: any,
  user: firebase.auth.UserRecord
) => {
  if (isBuilding) {
    return { success: false, message: `another build currently in progress` };
  } else {
    isBuilding = true;
  }
  const { tablePath, tableConfigPath } = req.body;
  const pathname = req.body.pathname.substring(1);
  if (!pathname || !tablePath)
    return { success: false, message: `missing pathname or tablePath` };
  // get settings Document
  const settings = await db.doc(`_rowy_/settings`).get();
  const tables = settings.get("tables");
  const collectionType = getCollectionType(pathname);
  const collectionPath = getCollectionPath(
    collectionType,
    tablePath,
    pathname,
    tables
  );
  const functionName = getFunctionName(collectionType, collectionPath);
  const functionConfigPath = `_rowy_/settings/functions/${functionName}`;
  const streamLogger = await createStreamLogger(functionConfigPath);
  await streamLogger.info("streamLogger created");
  try {
    const table = tables.find((t: any) => t.path === tablePath);
    const triggerPath = getTriggerPath(
      collectionType,
      collectionPath,
      table?.depth
    );
    const tableSchemaPaths = getSchemaPaths({
      collectionType,
      collectionPath,
      tables,
      tableConfigPath,
    });
    const projectId = process.env.DEV
      ? require("../../firebase-adminsdk.json").project_id
      : await getProjectId();
    console.log({
      projectId,
      collectionType,
      collectionPath,
      triggerPath,
      functionName,
      functionConfigPath,
      tablePath,
      tableConfigPath,
      tableSchemaPaths,
    });
    await Promise.all([
      db
        .doc(functionConfigPath)
        .set({ updatedAt: new Date() }, { merge: true }),
      db.doc(tableConfigPath).update({
        functionConfigPath,
      }),
    ]);

    const success = await generateConfig(
      {
        functionConfigPath,
        tableSchemaPaths,
        functionName,
        triggerPath,
      },
      user,
      streamLogger
    );
    if (!success) {
      await streamLogger.error("generateConfig failed to complete");
      await streamLogger.fail();
      return {
        success: false,
        reason: `generateConfig failed to complete`,
      };
    }
    await streamLogger.info("generateConfig success");

    await asyncExecute(
      `cd build/functionBuilder/functions; \
     yarn install`,
      commandErrorHandler({ user }, streamLogger)
    );

    streamLogger.info(`deploying ${functionName} to ${projectId}`);
    await asyncExecute(
      `cd build/functionBuilder/functions; \
       yarn deploy \
        --project ${projectId} \
        --only functions`,
      commandErrorHandler({ user }, streamLogger)
    );
    isBuilding = false;
    await streamLogger.end();
    return {
      success: true,
    };
  } catch (error) {
    isBuilding = false;
    console.log(error);
    await streamLogger.error(
      "Function Builder Failed:\n" + JSON.stringify(error)
    );
    await streamLogger.fail();
    return {
      success: false,
      reason: `generateConfig failed to complete`,
    };
  }
};
