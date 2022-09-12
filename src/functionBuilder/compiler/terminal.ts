import admin from "firebase-admin";
import { commandErrorHandler, logErrorToDB } from "../logger";
import { asyncExecute } from "../../terminalUtils";

export const addPackages = async (
  packages: { name: string; version?: string }[],
  user: admin.auth.UserRecord,
  streamLogger,
  buildPath
) => {
  const packagesString = packages.reduce((acc, currPackage) => {
    return `${acc} ${currPackage.name}@${currPackage.version ?? "latest"}`;
  }, "");
  if (packagesString.trim().length !== 0) {
    const success = await asyncExecute(
      `cd ${buildPath};yarn add ${packagesString}`,
      commandErrorHandler(
        {
          user,
          description: "Error adding packages",
        },
        streamLogger
      )
    );
    return success;
  }
  return true;
};
