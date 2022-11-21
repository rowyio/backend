import { Logging } from "@google-cloud/logging";
import { getProjectId } from "../utils/metadataService";

type FunctionType = "derivative" | "extension" | "action" | "defaultValue";

interface RowyLogging {
  log: (payload: any) => void;
  warn: (payload: any) => void;
  error: (payload: any) => void;
}

class LoggingFactory {
  public static async createDerivativesLogging(fieldName: string) {
    const projectId = await getProjectId();
    return new LoggingDerivatives(projectId, fieldName);
  }
}

class LoggingDerivatives implements RowyLogging {
  private readonly functionType: FunctionType = "derivative";
  private readonly fieldName: string;
  private readonly logging: Logging;

  constructor(projectId: string, fieldName: string) {
    this.fieldName = fieldName;
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
      payload: payloadSize > 250000 ? { v: "payload too large" } : payload,
    });
    await log.write(entry);
  }

  async log(payload: any) {
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
