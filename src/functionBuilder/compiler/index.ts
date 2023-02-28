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
import { DocumentData } from "firebase-admin/firestore";

export default async function generateConfig(
  data: {
    functionConfigPath: string;
    functionName: string;
    triggerPath: string;
    tableSchemaPaths: string[];
    rowySettings: DocumentData;
  },
  user: admin.auth.UserRecord,
  streamLogger,
  buildPath,
  buildFolderTimestamp
) {
  const projectId = await getProjectId();
  await asyncExecute(
    `cd ${buildPath};pwd;ls -al`,
    () => {
      streamLogger.info("1");
    },
    streamLogger
  );
  await asyncExecute(
    `cd ${buildPath};less package.json`,
    () => {
      streamLogger.info("2");
    },
    streamLogger
  );
  await asyncExecute(
    `cd ${buildPath}/src;pwd;ls -al`,
    () => {
      streamLogger.info("3");
    },
    streamLogger
  );
  await asyncExecute(
    `cd ${buildPath};yarn install --mutex network`,
    () => {
      streamLogger.info("Base dependencies installed successfully");
    },
    streamLogger
  );

  await streamLogger.info(`Generating schema...`);
  const {
    functionConfigPath,
    tableSchemaPaths,
    triggerPath,
    functionName,
    rowySettings,
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

  await streamLogger.info(`Generating config file...`);
  const region = rowySettings.cloudFunctionsRegion ?? "us-central1";
  const searchHost = rowySettings.services?.search ?? null;
  await generateFile(
    {
      ...combinedConfig,
      functionName,
      triggerPath,
      projectId,
      region,
      searchHost,
    },
    buildFolderTimestamp
  );

  await streamLogger.info(`Retrieving config file...`);
  const configFile = fs.readFileSync(
    path.resolve(
      __dirname,
      `../builds/${buildFolderTimestamp}/src/functionConfig.ts`
    ),
    "utf-8"
  );

  await streamLogger.info(`Validating config file...`);
  const isFunctionConfigValid = await asyncExecute(
    `cd ${buildPath}/src;tsc functionConfig.ts`,
    commandErrorHandler(
      {
        user,
        functionConfigTs: configFile,
        description: `Invalid compiled functionConfig.ts`,
      },
      streamLogger
    ),
    streamLogger
  );
  if (!isFunctionConfigValid) {
    throw new Error("Invalid compiled functionConfig.ts");
  }
  await streamLogger.info(`Config file: ${JSON.stringify(configFile)}`);

  const {
    derivativesConfig,
    defaultValueConfig,
    extensionsConfig,
  } = require(`../builds/${buildFolderTimestamp}/src/functionConfig`);
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
  const packageJson = require(`../builds/${buildFolderTimestamp}/package.json`);
  const installedDependencies = Object.keys(packageJson.dependencies);

  const requiredDependenciesToInstall = requiredDependencies?.filter(
    (i) => !installedDependencies.includes(i.name)
  );

  await streamLogger.info(
    `Installing dependencies: ${JSON.stringify(requiredDependenciesToInstall)}`
  );
  if (
    requiredDependenciesToInstall &&
    requiredDependenciesToInstall.length > 0
  ) {
    const packagesAdded = await addPackages(
      requiredDependenciesToInstall,
      user,
      streamLogger,
      buildPath
    );
    if (!packagesAdded) {
      return false;
    }
  }

  const requiredExtensions = extensionsConfig.map((s: any) => s.type);
  await streamLogger.info(
    `Installing extensions: ${JSON.stringify(requiredExtensions)}`
  );
  for (const lib of requiredExtensions) {
    const success = await addExtensionLib(
      lib,
      user,
      streamLogger,
      buildPath,
      buildFolderTimestamp
    );
    if (!success) {
      return false;
    }
  }
  return true;
}
