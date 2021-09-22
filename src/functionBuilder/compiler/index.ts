import { addPackages, asyncExecute } from "./terminal";
import { addExtensionLib } from "./extensions";
const fs = require("fs");
import {
  getConfigFromTableSchema,
  generateFile,
  combineConfigs,
} from "./loader";
import { commandErrorHandler } from "../logger";
import { db } from "../../firebaseConfig";
const path = require("path");
import admin from "firebase-admin";

export default async function generateConfig(
  data: {
    functionConfigPath: string;
    collectionType: string;
    collectionPath: string;
    functionName: string;
    triggerPath: string;
    tables: any[];
  },
  user: admin.auth.UserRecord,
  streamLogger
) {
  const {
    functionConfigPath,
    collectionType,
    collectionPath,
    triggerPath,
    functionName,
    tables,
  } = data;
  let tableSchemaPaths = [];
  switch (collectionType) {
    case "collection":
      const collectionTables = tables.filter(
        (table: any) => table.collection === collectionPath
      );
      tableSchemaPaths = collectionTables.map(
        (table: any) =>
          `/_rowy_/settings/schema/${table.id ?? table.collection}`
      );
      break;
    default:
      break;
  }
  const configs = (
    await Promise.all(
      tableSchemaPaths.map((path) =>
        getConfigFromTableSchema(path, streamLogger)
      )
    )
  ).filter((i) => i !== false);
  const combinedConfig = combineConfigs(configs);

  await db.doc(functionConfigPath).set(
    {
      config: combinedConfig,
      updatedAt: new Date(),
    },
    { merge: true }
  );
  generateFile({ ...combinedConfig, functionName, triggerPath });

  await streamLogger.info(`generateConfigFromTableSchema done`);
  const configFile = fs.readFileSync(
    path.resolve(__dirname, "../functions/src/functionConfig.ts"),
    "utf-8"
  );
  // sleep for a second
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await streamLogger.info(`configFile: ${JSON.stringify(configFile)}`);
  const requiredDependencies = configFile.match(
    /(?<=(require\(("|'))).*?(?=("|')\))/g
  );
  if (requiredDependencies) {
    const packgesAdded = await addPackages(
      requiredDependencies.map((p: any) => ({ name: p })),
      user,
      streamLogger
    );
    if (!packgesAdded) {
      return false;
    }
  }
  await streamLogger.info(
    `requiredDependencies: ${JSON.stringify(requiredDependencies)}`
  );

  const isFunctionConfigValid = await asyncExecute(
    "cd build/functionBuilder/functions/src; tsc functionConfig.ts",
    commandErrorHandler(
      {
        user,
        functionConfigTs: configFile,
        description: `Invalid compiled functionConfig.ts`,
      },
      streamLogger
    )
  );
  await streamLogger.info(
    `isFunctionConfigValid: ${JSON.stringify(isFunctionConfigValid)}`
  );
  if (!isFunctionConfigValid) {
    return false;
  }

  const { extensionsConfig } = require("../functions/src/functionConfig.js");
  const requiredExtensions = extensionsConfig.map((s: any) => s.type);
  await streamLogger.info(
    `requiredExtensions: ${JSON.stringify(requiredExtensions)}`
  );

  for (const lib of requiredExtensions) {
    const success = await addExtensionLib(lib, user, streamLogger);
    if (!success) {
      return false;
    }
  }

  return true;
}
