import { asyncExecute } from "./compiler/terminal";
import { createStreamLogger } from "./utils";
import generateConfig from "./compiler";
import { auth } from "../firebaseConfig";
import { commandErrorHandler } from "./utils";
import firebase from "firebase-admin";


export const functionBuilder =  async (req: any, res: any) => {
  let user: firebase.auth.UserRecord;

  const userToken = req?.body?.token;
  if (!userToken) {
    console.log("missing auth token");
    res.send({
      success: false,
      reason: "missing auth token",
    });
    return;
  }
  
  try {
    const decodedToken = await auth.verifyIdToken(userToken);
    const uid = decodedToken.uid;
    user = await auth.getUser(uid);
    const roles = user?.customClaims?.roles;
    if (!roles || !Array.isArray(roles) || !roles?.includes("ADMIN")) {
      res.send({
        success: false,
        reason: `user is not admin`,
      });
      return;
    }
    console.log("successfully authenticated");
  } catch (error) {
    res.send({
      success: false,
      reason: `error verifying auth token: ${error}`,
    });
    return;
  }

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


  // get gcp project id from metadata
  const projectId = process.env.GCP_PROJECT_ID;
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

