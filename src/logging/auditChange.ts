import { Logging } from "@google-cloud/logging";
import { Request } from "express";
import { getProjectId } from "../metadataService";
import { User } from "../types/User";

export const auditChange = async (req: Request, user: User) => {
  const { rowyUser } = req.body;
  if (user.uid !== rowyUser.uid) throw new Error("401");

  const projectId = await getProjectId();
  const logging = new Logging({ projectId });
  // Selects the log to write to
  const log = logging.log(`rowy-audit`);
  // The data to write to the log
  // The metadata associated with the entry
  const metadata = {
    resource: {
      type: "global",
    },
    severity: "DEFAULT",
  };
  // Prepares a log entry
  const entry = log.entry(metadata, req.body);
  return log.write(entry);
};
