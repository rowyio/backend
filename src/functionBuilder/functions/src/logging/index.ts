import { Logging } from "@google-cloud/logging";

type FunctionType = "derivative-function" | "extension" | "defaultValue";
type IExtensionSource = "condition" | "function";

interface RowyLogging {
  log: (...payload: any[]) => void;
  warn: (...payload: any[]) => void;
  error: (...payload: any[]) => void;
}

class LoggingFactory {
  public static async createDerivativeLogging(
    fieldName: string,
    rowId: string,
    tablePath: string
  ) {
    const projectId = process.env.GCLOUD_PROJECT;
    return new LoggingDerivative(
      projectId,
      fieldName,
      rowId,
      "derivative-function",
      tablePath
    );
  }

  public static async createExtensionLogging(
    extensionType: string,
    extensionSource: IExtensionSource,
    extensionName: string,
    tablePath: string
  ) {
    const projectId = process.env.GCLOUD_PROJECT;
    return new LoggingExtension(
      projectId,
      extensionType,
      extensionSource,
      extensionName,
      tablePath
    );
  }

  public static async createDefaultValueLogging(
    fieldName: string,
    rowId: string,
    tablePath: string
  ) {
    const projectId = process.env.GCLOUD_PROJECT;
    return new LoggingDefaultValue(
      projectId,
      fieldName,
      rowId,
      "defaultValue",
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

class LoggingDerivative extends LoggingAbstract implements RowyLogging {
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
      loggingSource: "backend-function",
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

class LoggingExtension extends LoggingAbstract implements RowyLogging {
  private readonly extensionType: string;
  private readonly extensionSource: IExtensionSource;
  private readonly extensionName: string;
  private readonly tablePath: string;

  constructor(
    projectId: string,
    extensionType: string,
    extensionSource: IExtensionSource,
    extensionName: string,
    tablePath: string
  ) {
    super(projectId, "extension");
    this.extensionType = extensionType;
    this.extensionSource = extensionSource;
    this.extensionName = extensionName;
    this.tablePath = tablePath;
  }

  async logWithSeverity(payload: any[], severity: string) {
    const log = this.logging.log(`rowy-logging`);
    const metadata = {
      severity,
    };
    const payloadSize = JSON.stringify(payload).length;
    const entry = log.entry(metadata, {
      loggingSource: "backend-function",
      functionType: this.functionType,
      extensionType: this.extensionType,
      extensionSource: this.extensionSource,
      extensionName: this.extensionName,
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

class LoggingDefaultValue extends LoggingAbstract implements RowyLogging {
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
      loggingSource: "backend-function",
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
