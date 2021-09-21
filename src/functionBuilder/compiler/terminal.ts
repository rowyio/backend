import * as child from "child_process";
import admin from "firebase-admin";
import { commandErrorHandler, logErrorToDB } from "../logger";

function execute(command: string, callback: any) {
  console.log(command);
  child.exec(command, function (error, stdout, stderr) {
    console.log({ error, stdout, stderr });
    callback(stdout);
  });
}

export const asyncExecute = async (command: string, callback: any) =>
  new Promise(async (resolve, reject) => {
    child.exec(command, async function (error, stdout, stderr) {
      console.log({ error, stdout, stderr });
      await callback(error, stdout, stderr);
      resolve(!error);
    });
  });

export const addPackages = async (
  packages: { name: string; version?: string }[],
  user: admin.auth.UserRecord,
  streamLogger
) => {
  const packagesString = packages.reduce((acc, currPackage) => {
    return `${acc} ${currPackage.name}@${currPackage.version ?? "latest"}`;
  }, "");
  if (packagesString.trim().length !== 0) {
    const success = await asyncExecute(
      `cd build/functionBuilder/functions;yarn add ${packagesString}`,
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
