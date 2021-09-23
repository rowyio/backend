import { addPackages, asyncExecute } from "./terminal";
import { addExtensionLib } from "./extensions";
import * as _ from "lodash";
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
  if (!isFunctionConfigValid)
    throw new Error("Invalid compiled functionConfig.ts");
  await streamLogger.info(
    `isFunctionConfigValid: ${JSON.stringify(isFunctionConfigValid)}`
  );
  await streamLogger.info(`configFile: ${JSON.stringify(configFile)}`);
  let requiredDependencies = [];
  const {
    derivativesConfig,
    defaultValueConfig,
    extensionsConfig,
  } = require("../functions/src/functionConfig");
  derivativesConfig.forEach((i) => {
    if (i.requiredPackages && i.requiredPackages.length > 0) {
      requiredDependencies = requiredDependencies.concat(i.requiredPackages);
    }
  });
  defaultValueConfig.forEach((i) => {
    if (i.requiredPackages && i.requiredPackages.length > 0) {
      requiredDependencies = requiredDependencies.concat(i.requiredPackages);
    }
  });
  extensionsConfig.forEach((i) => {
    if (i.requiredPackages && i.requiredPackages.length > 0) {
      requiredDependencies = requiredDependencies.concat(i.requiredPackages);
    }
  });

  // remove duplicates from requiredDependencies with lodash
  requiredDependencies = _.uniqWith(requiredDependencies, _.isEqual);

  if (requiredDependencies) {
    const packgesAdded = await addPackages(
      requiredDependencies,
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
