import * as functions from "firebase-functions";
import utilFns from "../utils";
import { db, auth, storage } from "../firebaseConfig";
import { LoggingFactory } from "../logging";

const initializedDoc = (
  columns: { fieldName: string; type: string; value?: any; script?: any }[]
) => {
  return async (snapshot: functions.firestore.DocumentSnapshot) =>
    columns.reduce(async (acc, column) => {
      const logging = await LoggingFactory.createDefaultValueLogging(
        column.fieldName,
        snapshot.ref.id,
        snapshot.ref.path
      );

      if (snapshot.get(column.fieldName) !== undefined)
        return { ...(await acc) }; // prevents overwriting already initialised values
      if (column.type === "static") {
        return {
          ...(await acc),
          [column.fieldName]: column.value,
        };
      } else if (column.type === "null") {
        return { ...(await acc), [column.fieldName]: null };
      } else if (column.type === "dynamic") {
        return {
          ...(await acc),
          [column.fieldName]: await column.script.default({
            row: snapshot.data(),
            ref: snapshot.ref,
            db,
            auth,
            storage,
            utilFns,
            logging,
          }),
        };
      } else return { ...(await acc) };
    }, {});
};
export default initializedDoc;
