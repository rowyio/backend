import { Logging } from "@google-cloud/logging";
import { getProjectId } from "../metadataService";

type FunctionType = "action" | "connector" | "derivative";

interface RowyLogging {
  log: (payload: any) => void;
  warn: (payload: any) => void;
  error: (payload: any) => void;
}

class LoggingFactory {
  public static async createActionLogging(fieldName: string, rowId: string) {
    const projectId = await getProjectId();
    return new LoggingAction(projectId, fieldName, rowId);
  }
}

class LoggingAction implements RowyLogging {
  private readonly functionType: FunctionType = "action";
  private readonly fieldName: string;
  private readonly rowId: string;
  private readonly logging: Logging;

  constructor(projectId: string, fieldName: string, rowId: string) {
    this.fieldName = fieldName;
    this.rowId = rowId;
    this.logging = new Logging({ projectId });
  }

  private async logWithSeverity(payload: any, severity: string) {
    const log = this.logging.log(`rowy-logging`);
    const metadata = {
      resource: {
        type: "global",
      },
      severity,
    };
    const payloadSize = JSON.stringify(payload).length;
    const entry = log.entry(metadata, {
      functionType: this.functionType,
      fieldName: this.fieldName,
      rowId: this.rowId,
      payload: payloadSize > 250000 ? { v: "payload too large" } : payload,
    });
    await log.write(entry);
  }

  async log(payload: any) {
    console.log("executing: log");
    await this.logWithSeverity(payload, "DEFAULT");
  }

  async warn(payload: any) {
    await this.logWithSeverity(payload, "WARNING");
  }

  async error(payload: any) {
    await this.logWithSeverity(payload, "ERROR");
  }
}

export { LoggingFactory, RowyLogging };
