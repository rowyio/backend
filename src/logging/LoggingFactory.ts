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
    return new LoggingFieldAndRow(projectId, fieldName, rowId, "action");
  }

  public static async createConnectorLogging(fieldName: string, rowId: string) {
    const projectId = await getProjectId();
    return new LoggingFieldAndRow(projectId, fieldName, rowId, "connector");
  }

  public static async createDerivativeLogging(
    fieldName: string,
    rowId: string
  ) {
    const projectId = await getProjectId();
    return new LoggingFieldAndRow(projectId, fieldName, rowId, "derivative");
  }
}

class LoggingAbstract implements RowyLogging {
  protected readonly functionType;
  protected readonly logging: Logging;

  constructor(projectId: string, functionType: FunctionType) {
    this.functionType = functionType;
    this.logging = new Logging({ projectId });
  }

  protected async logWithSeverity(payload: any, severity: string) {
    throw new Error("logWithSeverity must be implemented");
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

class LoggingFieldAndRow extends LoggingAbstract implements RowyLogging {
  private readonly fieldName: string;
  private readonly rowId: string;

  constructor(
    projectId: string,
    fieldName: string,
    rowId: string,
    functionType: FunctionType
  ) {
    super(projectId, functionType);
    this.fieldName = fieldName;
    this.rowId = rowId;
  }

  async logWithSeverity(payload: any, severity: string) {
    const log = this.logging.log(`rowy-logging`);
    const metadata = {
      severity,
    };
    const payloadSize = JSON.stringify(payload).length;
    const entry = log.entry(metadata, {
      loggingSource: "backend-scripts",
      functionType: this.functionType,
      fieldName: this.fieldName,
      rowId: this.rowId,
      payload: payloadSize > 250000 ? { v: "payload too large" } : payload,
    });
    await log.write(entry);
  }
}

export { LoggingFactory, RowyLogging };
