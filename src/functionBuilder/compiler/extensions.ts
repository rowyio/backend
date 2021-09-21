import admin from "firebase-admin";
import { commandErrorHandler, logErrorToDB } from "../logger";
import { addPackages, asyncExecute } from "./terminal";
import { getExtension } from "../../rowyService";

export const addExtensionLib = async (
  name: string,
  user: admin.auth.UserRecord,
  streamLogger
) => {
  try {
    const extensionResp = await getExtension(name);
    const { extension, dependencies } = extensionResp;
    const packages = Object.keys(dependencies).map((key) => ({
      name: key,
      version: dependencies[key],
    }));
    const success = await addPackages(packages, user, streamLogger);
    if (!success) {
      return false;
    }
    const fs = require("fs");
    const path = require("path");
    fs.writeFileSync(
      path.resolve(__dirname, `../functions/src/extensions/${name}.ts`),
      extension
    );
    await asyncExecute(
      `cd build/functionBuilder/functions/src/extensions; tsc ${name}.ts`,
      commandErrorHandler(
        {
          user,
          description: "Error compiling extensionsLib",
        },
        streamLogger
      )
    );
  } catch (error) {
    console.log(error);
    logErrorToDB(
      {
        user,
        errorDescription: `Error installing extension ${name}`,
      },
      streamLogger
    );
    return false;
  }
  return true;
};
