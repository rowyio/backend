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

export const functionBuilder = async (req: any, res: any) => {
  const user: firebase.auth.UserRecord = res.locals.user;
  const { pathname, tablePath } = req.body;
  if (!pathname || !tablePath)
    res.send({ success: false, message: `missing pathname or tablePath` });
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
  console.log({ collectionType, collectionPath, triggerPath });
  const functionName = getFunctionName(collectionType, collectionPath);
  const functionConfigPath = `_rowy_/settings/functions/${functionName}`;
  console.log({ functionConfigPath });
  const projectId = process.env.DEV
    ? require("../../firebase-adminsdk.json").project_id
    : await getProjectId();
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
    res.send({
      success: false,
      reason: `generateConfig failed to complete`,
    });
    return;
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
  res.send({
    success: true,
  });
};
