import * as functions from "firebase-functions/v1";
import utilFns, { hasRequiredFields, getTriggerType } from "../utils";
import { db, auth, storage } from "../firebaseConfig";
import { LoggingFactory } from "../logging";

const extension =
  (extensionConfig, fieldTypes, tableSchema) =>
  async (
    change: functions.Change<functions.firestore.DocumentSnapshot>,
    context: functions.EventContext
  ) => {
    const beforeData = change.before?.data();
    const afterData = change.after?.data();
    const ref = change.after ? change.after.ref : change.before.ref;
    const triggerType = getTriggerType(change);
    try {
      const { name, type, triggers, requiredFields, trackedFields } =
        extensionConfig;
      const loggingCondition = await LoggingFactory.createExtensionLogging(
        type,
        "condition",
        name,
        ref.path
      );
      const loggingFunction = await LoggingFactory.createExtensionLogging(
        type,
        "function",
        name,
        ref.path
      );
      const extensionContext = {
        row: triggerType === "delete" ? beforeData : afterData,
        ref,
        db,
        auth,
        change,
        triggerType,
        extensionConfig,
        utilFns,
        fieldTypes,
        storage,
        tableSchema,
      };
      const extensionContextCondition = {
        ...extensionContext,
        logging: loggingCondition,
      };
      const extensionContextFunction = {
        ...extensionContext,
        logging: loggingFunction,
      };
      if (!triggers.includes(triggerType)) return false; //check if trigger type is included in the extension
      if (
        triggerType === "update" &&
        trackedFields?.length > 0 &&
        !utilFns.hasChanged(change)(trackedFields)
      ) {
        console.log("listener fields didn't change");
        return false;
      }
      if (
        triggerType !== "delete" &&
        requiredFields &&
        requiredFields.length !== 0 &&
        !hasRequiredFields(requiredFields, afterData)
      ) {
        console.log("requiredFields are ", requiredFields, "type is", type);
        return false; // check if it hase required fields for the extension to run
      }
      const dontRun = !(await extensionConfig.conditions.default(
        extensionContextCondition
      ));
      console.log(`name: "${name}", type: "${type}", dontRun: ${dontRun}`);

      if (dontRun) return false;
      const extensionData = await extensionConfig.extensionBody.default(
        extensionContextFunction
      );
      console.log(`extensionData: ${JSON.stringify(extensionData)}`);
      const extensionFn = require(`./${type}`).default;
      await extensionFn(extensionData, extensionContext);
      return true;
    } catch (err) {
      const { name, type } = extensionConfig;
      console.log(
        `error in ${name} extension of type ${type}, on ${context.eventType} in Doc ${context.resource.name}`
      );
      console.error(err);
      return Promise.reject(err);
    }
  };

export default extension;
