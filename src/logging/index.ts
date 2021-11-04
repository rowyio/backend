import { getProjectId } from "../metadataService";
import { Request } from "express";
import * as _ from "lodash";
import { Logging } from "@google-cloud/logging";

// function tryParseJSONObject(jsonString: string) {
//   try {
//     var o = JSON.parse(jsonString);
//     if (o && typeof o === "object") {
//       return o;
//     }
//   } catch (e) {}

//   return null;
// }

// export async function getFunctionLogs(req: Request) {
//   if (!req.params.functionName) throw Error("No function Name provided");
//   // Creates a client
//   const projectId = await getProjectId();
//   const logging = new Logging({ projectId });
//   const filter = `resource.labels.function_name = "${req.params.functionName}"`;
//   const pageSize = 100;
//   const orderBy = "timestamp desc";
//   const options = {
//     filter,
//     pageSize,
//     orderBy,
//   };
//   const [entries] = await logging.getEntries(options);
//   console.log(`entry ${entries.length}`);
//   return _.groupBy(
//     entries.map((entry) => {
//       const { labels, timestamp, textPayload, payload } = entry.toJSON() as any;
//       return {
//         labels,
//         timestamp,
//         textPayload,
//         payload,
//         jsonPayload: tryParseJSONObject(textPayload),
//       };
//     }),
//     "labels.execution_id"
//   );
// }

export async function getLogs(req: Request) {
  // Creates a client
  const projectId = await getProjectId();
  const logging = new Logging({ projectId });
  const pageSize = 100;
  const orderBy = "timestamp desc";
  const options = {
    filter: req.query.filter as string,
    pageSize,
    orderBy: (req.query.orderBy ?? orderBy) as string,
  };
  const [entries] = await logging.getEntries(options);
  console.log(`entry ${entries.length}`);
  return entries.map((entry) => {
    return entry.toJSON();
  });
}
