import * as child from "child_process";

export function execute(command: string, callback: any) {
  console.log(command);
  child.exec(command, function (error, stdout, stderr) {
    console.log({ error, stdout, stderr });
    callback(stdout);
  });
}

export const asyncExecute = async (
  command: string,
  callback?: any,
  logger?
) => {
  logger?.info(`Executing: ${command}`);
  return new Promise(async (resolve, reject) => {
    child.exec(command, async function (error, stdout, stderr) {
      logger?.info(`stdout: ${JSON.stringify({ error, stdout, stderr })}`);
      await callback?.(error, stdout, stderr);
      resolve(!error);
    });
  });
};
