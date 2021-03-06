import { addPackages } from "./terminal";
import { addExtensionLib } from "./extensions";
import { asyncExecute } from "../../terminalUtils";
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
import { getProjectId } from "../../metadataService";

export default async function generateConfig(
  data: {
    functionConfigPath: string;
    functionName: string;
    triggerPath: string;
    tableSchemaPaths: string[];
    region: string;
  },
  user: admin.auth.UserRecord,
  streamLogger
) {
  const projectId = await getProjectId();
  const yarn = await asyncExecute(
    `cd build/functionBuilder/functions;yarn`,
    () => {
      streamLogger.info("base dependencies installed successfully");
    }
  );
  const {
    functionConfigPath,
    tableSchemaPaths,
    triggerPath,
    functionName,
    region,
  } = data;
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
  await generateFile({
    ...combinedConfig,
    functionName,
    triggerPath,
    projectId,
    region,
  });

  await streamLogger.info(`generateConfigFromTableSchema done`);
  const configFile = fs.readFileSync(
    path.resolve(__dirname, "../functions/src/functionConfig.ts"),
    "utf-8"
  );
  const isFunctionConfigValid = await asyncExecute(
    "cd build/functionBuilder/functions/src;tsc functionConfig.ts",
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
  streamLogger.info(
    `isFunctionConfigValid: ${JSON.stringify(isFunctionConfigValid)}`
  );
  await streamLogger.info(`configFile: ${JSON.stringify(configFile)}`);
  const {
    derivativesConfig,
    defaultValueConfig,
    extensionsConfig,
  } = require("../functions/src/functionConfig");
  const requiredDepsReducer = (acc, curr) => {
    if (curr.requiredPackages && curr.requiredPackages.length > 0) {
      return acc.concat(curr.requiredPackages);
    }
    return acc;
  };
  const derivativesRequiredDeps = derivativesConfig.reduce(
    requiredDepsReducer,
    []
  );
  const defaultValueRequiredDeps = defaultValueConfig.reduce(
    requiredDepsReducer,
    []
  );
  const extensionsRequiredDeps = extensionsConfig.reduce(
    requiredDepsReducer,
    []
  );
  // remove duplicates from requiredDependencies with lodash
  const requiredDependencies = _.uniqWith(
    [
      ...derivativesRequiredDeps,
      ...defaultValueRequiredDeps,
      ...extensionsRequiredDeps,
    ],
    _.isEqual
  );
  // remove all dependencies that are already installed
  const packageJson = require("../functions/package.json");
  const installedDependencies = Object.keys(packageJson.dependencies);

  const requiredDependenciesToInstall = requiredDependencies?.filter(
    (i) => !installedDependencies.includes(i.name)
  );

  if (
    requiredDependenciesToInstall &&
    requiredDependenciesToInstall.length > 0
  ) {
    const packagesAdded = await addPackages(
      requiredDependenciesToInstall,
      user,
      streamLogger
    );
    if (!packagesAdded) {
      return false;
    }
  }
  if (
    requiredDependenciesToInstall &&
    requiredDependenciesToInstall.length > 0
  ) {
    await streamLogger.info(
      `requiredDependencies: ${JSON.stringify(requiredDependenciesToInstall)}`
    );
  }
  const requiredExtensions = extensionsConfig.map((s: any) => s.type);
  if (requiredExtensions && requiredExtensions.length > 0) {
    await streamLogger.info(
      `requiredExtensions: ${JSON.stringify(requiredExtensions)}`
    );
  }
  for (const lib of requiredExtensions) {
    const success = await addExtensionLib(lib, user, streamLogger);
    if (!success) {
      return false;
    }
  }
  return true;
}
