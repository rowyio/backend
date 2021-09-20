import { asyncExecute } from "./compiler/terminal";
import {
  getCollectionType,
  getCollectionPath,
  getFunctionName,
  getTriggerPath,
} from "./utils";
import generateConfig from "./compiler";
import { commandErrorHandler, createStreamLogger } from "./logger";
import firebase from "firebase-admin";
import { getProjectId } from "../metadataService";
import { db } from "../firebaseConfig";

export const functionBuilder = async (
  req: any,
  user: firebase.auth.UserRecord
) => {
  const { tablePath, tableConfigPath } = req.body;
  const pathname = req.body.pathname.substring(1);
  if (!pathname || !tablePath)
    return { success: false, message: `missing pathname or tablePath` };
  // get settings Document
  const settings = await db.doc(`_rowy_/settings`).get();
  const tables = settings.get("tables");
  const collectionType = getCollectionType(pathname);
  const collectionPath = getCollectionPath(collectionType, pathname, tables);
  const table = tables.find((t: any) => t.path === tablePath);
  const triggerPath = getTriggerPath(
    collectionType,
    collectionPath,
    table?.depth
  );
  const functionName = getFunctionName(collectionType, collectionPath);
  const functionConfigPath = `_rowy_/settings/functions/${functionName}`;
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
  });
  await Promise.all([
    db.doc(functionConfigPath).set({ updatedAt: new Date() }, { merge: true }),
    db.doc(tableConfigPath).update({
      functionConfigPath,
    }),
  ]);
  console.log("path set");
  const streamLogger = await createStreamLogger(functionConfigPath);
  await streamLogger.info("streamLogger created");

  const success = await generateConfig(
    {
      functionConfigPath,
      collectionType,
      collectionPath,
      functionName,
      tables,
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

  console.log(`deploying to ${projectId}`);
  await asyncExecute(
    `cd build/functionBuilder/functions; \
     yarn install`,
    commandErrorHandler({ user }, streamLogger)
  );

  await asyncExecute(
    `cd build/functionBuilder/functions; \
       yarn deploy \
        --project ${projectId} \
        --only functions`,
    commandErrorHandler({ user }, streamLogger)
  );

  await streamLogger.end();
  return {
    success: true,
  };
};
