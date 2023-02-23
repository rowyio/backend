import { Logging } from "@google-cloud/logging";
import { getProjectId } from "../metadataService";

type FunctionType = "action" | "connector" | "derivative-script";

interface RowyLogging {
  log: (payload: any) => void;
  warn: (payload: any) => void;
  error: (payload: any) => void;
}

class LoggingFactory {
  public static async createActionLogging(
    fieldName: string,
    rowId: string,
    tablePath: string
  ) {
    const projectId = await getProjectId();
    return new LoggingFieldAndRow(
      projectId,
      fieldName,
      rowId,
      "action",
      tablePath
    );
  }

  public static async createConnectorLogging(
    fieldName: string,
    rowId: string,
    tablePath: string
  ) {
    const projectId = await getProjectId();
    return new LoggingFieldAndRow(
      projectId,
      fieldName,
      rowId,
      "connector",
      tablePath
    );
  }

  public static async createDerivativeLogging(
    fieldName: string,
    rowId: string,
    tablePath: string
  ) {
    const projectId = await getProjectId();
    return new LoggingFieldAndRow(
      projectId,
      fieldName,
      rowId,
      "derivative-script",
      tablePath
    );
  }
}

class LoggingAbstract implements RowyLogging {
  protected readonly functionType;
  protected readonly logging: Logging;

  constructor(projectId: string, functionType: FunctionType) {
    this.functionType = functionType;
    this.logging = new Logging({ projectId });
  }

  protected async logWithSeverity(payload: any[], severity: string) {
    throw new Error("logWithSeverity must be implemented");
  }

  async log(...payload: any[]) {
    await this.logWithSeverity(payload, "DEFAULT");
  }

  async warn(...payload: any[]) {
    await this.logWithSeverity(payload, "WARNING");
  }

  async error(...payload: any[]) {
    await this.logWithSeverity(payload, "ERROR");
  }
}

class LoggingFieldAndRow extends LoggingAbstract implements RowyLogging {
  private readonly fieldName: string;
  private readonly rowId: string;
  private readonly tablePath: string;

  constructor(
    projectId: string,
    fieldName: string,
    rowId: string,
    functionType: FunctionType,
    tablePath: string
  ) {
    super(projectId, functionType);
    this.fieldName = fieldName;
    this.rowId = rowId;
    this.tablePath = tablePath;
  }

  async logWithSeverity(payload: any[], severity: string) {
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
      tablePath: this.tablePath,
      payload:
        payloadSize > 250000
          ? { v: "payload too large" }
          : payload.length > 1
          ? payload
          : payload[0],
    });
    await log.write(entry);
  }
}

export { LoggingFactory, RowyLogging };
