import { asyncExecute } from "./compiler/terminal";
import { createStreamLogger } from "./utils";
import generateConfig from "./compiler";
import { commandErrorHandler } from "./utils";
import firebase from "firebase-admin";

export const functionBuilder =  async (req: any, res: any) => {
  const user: firebase.auth.UserRecord = res.locals.user;;
  const {triggerPath} = req.body;
  if (!triggerPath) res.send({ success: false, message: "no triggerPath" });
  const configPath = `_rowy_/settings/functions/${triggerPath}`
  const streamLogger = await createStreamLogger(configPath);
  await streamLogger.info("streamLogger created");

  const success = await generateConfig(triggerPath, user, streamLogger);
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
  
  const projectId =process.env.DEV?
   require("../../firebase-adminsdk.json").project_id
  :require("../../rowyConfig.json").projectId 
  console.log(`deploying to ${projectId}`);
  await asyncExecute(
    `cd build/functionBuilder/functions; \
     yarn install`,
    commandErrorHandler({ user }, streamLogger)
  );

  await asyncExecute(
    `cd build/functionBuilder/functions; \
       yarn deploy \
        --project ${projectId} \
        --only functions`,
    commandErrorHandler({ user }, streamLogger)
  );

  await streamLogger.end();
  res.send({
    success: true,
  });
}