import * as functions from "firebase-functions";
import derivative from "./derivatives";
import extension from "./extensions";
import * as config from "./functionConfig";
const functionConfig: any = config;
import { getTriggerType, changedDocPath } from "./utils";
import propagate from "./propagates";
import initialize from "./initialize";

export const R = {
  [functionConfig.functionName]: functions
    .region(functionConfig.region)
    .runWith(functionConfig.runtimeOptions)
    .firestore.document(functionConfig.triggerPath)
    .onWrite(async (change, context) => {
      const triggerType = getTriggerType(change);
      let promises: Promise<any>[] = [];
      const extensionPromises = functionConfig.extensionsConfig
        .filter((extensionConfig) =>
          extensionConfig.triggers.includes(triggerType)
        )
        .map((extensionConfig) => {
          try {
            extension(
              extensionConfig,
              functionConfig.fieldTypes,
              functionConfig.tableSchema
            )(change, context);
          } catch (err) {
            console.log(`caught error: ${err}`);
          }
        });
      console.log(
        `#${
          extensionPromises.length
        } extensions will be evaluated on ${triggerType} of ${changedDocPath(
          change
        )}`
      );
      promises = extensionPromises;
      const propagatePromise = propagate(
        change,
        functionConfig.documentSelectConfig,
        triggerType
      );
      promises.push(propagatePromise);
      try {
        let docUpdates = {};
        if (triggerType === "update") {
          try {
            docUpdates = await derivative(functionConfig.derivativesConfig)(
              change
            );
          } catch (err) {
            console.log(`caught error: ${err}`);
          }
        } else if (triggerType === "create") {
          try {
            const initialData = await initialize(
              functionConfig.defaultValueConfig
            )(change.after);
            const derivativeData = await derivative(
              functionConfig.derivativesConfig
            )(change);
            docUpdates = { ...initialData, ...derivativeData };
          } catch (err) {
            console.log(`caught error: ${err}`);
          }
        }
        if (Object.keys(docUpdates).length !== 0) {
          promises.push(change.after.ref.update(docUpdates));
        }
        await Promise.all(promises);
      } catch (err) {
        console.log(`caught error: ${err}`);
      }
    }),
};
