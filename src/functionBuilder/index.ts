import { asyncExecute } from "./compiler/terminal";
import { createStreamLogger } from "./utils";
import generateConfig from "./compiler";
import { auth } from "../firebaseConfig";
import { commandErrorHandler } from "./utils";
import firebase from "firebase-admin";


export const functionBuilder =  async (req: any, res: any) => {
  const user: firebase.auth.UserRecord = res.locals.user;
  const configPath = req?.body?.configPath;
  console.log("configPath:", configPath);

  if (!configPath) {
    res.send({
      success: false,
      reason: "invalid configPath",
    });
  }

  const streamLogger = await createStreamLogger(configPath);
  await streamLogger.info("streamLogger created");

  const success = await generateConfig(configPath, user, streamLogger);
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
  
  const projectId = process.env.GOOGLE_CLOUD_PROJECT?process.env.GOOGLE_CLOUD_PROJECT : require("../../firebase-adminsdk.json").project_id;
  console.log(`deploying to ${projectId}`);
  await asyncExecute(
    `cd build/functions; \
     yarn install`,
    commandErrorHandler({ user }, streamLogger)
  );

  await asyncExecute(
    `cd build/functions; \
       yarn deployFT \
        --project ${projectId} \
        --only functions`,
    commandErrorHandler({ user }, streamLogger)
  );

  await streamLogger.end();
  res.send({
    success: true,
  });
}