import { asyncExecute } from "../terminalUtils";
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
import fs from "fs";
import path from "path";

export const functionBuilder = async (
  req: any,
  user: firebase.auth.UserRecord
) => {
  try {
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

    const table = tables.find((t: any) => t.collection === tablePath);
    const functionName = getFunctionName(
      collectionType,
      collectionPath,
      table?.triggerDepth
    );
    const functionConfigPath = `_rowy_/settings/functions/${functionName}`;

    const streamLogger = await createStreamLogger(functionConfigPath);
    await streamLogger.info(
      `Build started. collectionType: ${collectionType}, tablePath: ${tablePath}, pathname: ${pathname}, functionName: ${functionName}`
    );
    const buildFolderTimestamp = Date.now();
    const buildPath = `build/functionBuilder/builds/${buildFolderTimestamp}`;

    try {
      const triggerPath = getTriggerPath(
        collectionType,
        collectionPath,
        table?.triggerDepth
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
      await Promise.all([
        db
          .doc(functionConfigPath)
          .set({ updatedAt: new Date() }, { merge: true }),
        db.doc(tableConfigPath).update({
          functionConfigPath,
        }),
      ]);

      // duplicate functions folder to build folder
      await streamLogger.info(`Duplicating functions template to ${buildPath}`);
      await asyncExecute(
        `mkdir -m 777 -p ${buildPath}; cp -Rp build/functionBuilder/functions/* ${buildPath}`,
        commandErrorHandler({ user }, streamLogger)
      );

      const success = await generateConfig(
        {
          functionConfigPath,
          tableSchemaPaths,
          functionName,
          triggerPath,
          rowySettings: settings.data(),
        },
        user,
        streamLogger,
        buildPath,
        buildFolderTimestamp
      );
      if (!success) {
        await streamLogger.error("generateConfig failed");
        await streamLogger.fail();
        return {
          success: false,
          reason: `generateConfig failed to complete`,
        };
      }

      await streamLogger.info("Installing dependencies...");
      await asyncExecute(
        `cd ${buildPath}; yarn install --mutex network`,
        commandErrorHandler({ user }, streamLogger)
      );

      await streamLogger.info(`Deploying ${functionName} to ${projectId}`);

      const configFile = fs.readFileSync(
        path.resolve(
          __dirname,
          `./builds/${buildFolderTimestamp}/src/functionConfig.js`
        ),
        "utf-8"
      );
      // replace all instances of // evaluate:require with evaluate:require
      let modifiedConfigFile = configFile.replace(
        /\/\/ evaluate:require/g,
        "evaluate:require"
      );
      modifiedConfigFile = modifiedConfigFile.replace(
        /\/\/ script:require/g,
        "script:require"
      );
      modifiedConfigFile = modifiedConfigFile.replace(
        /\/\/ extensionBody:require/g,
        "extensionBody:require"
      );
      modifiedConfigFile = modifiedConfigFile.replace(
        /\/\/ conditions:require/g,
        "conditions:require"
      );
      fs.writeFileSync(
        path.resolve(
          __dirname,
          `./builds/${buildFolderTimestamp}/src/functionConfig.js`
        ),
        modifiedConfigFile,
        "utf-8"
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
      await asyncExecute(
        `cd ${buildPath}; yarn deploy --project ${projectId} --only functions`,
        commandErrorHandler({ user }, streamLogger),
        streamLogger
      );
      await streamLogger.end();
      return {
        success: true,
      };
    } catch (error) {
      console.log(error);
      await streamLogger.error("Build Failed:\n" + JSON.stringify(error));
      await streamLogger.fail();
      return {
        success: false,
        reason: `generateConfig failed to complete`,
      };
    }
  } catch (error) {
    console.log(error);
    return {
      success: false,
      reason: `function builder failed`,
    };
  }
};
