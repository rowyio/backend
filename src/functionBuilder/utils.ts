import { db } from "../firebaseConfig";
import admin from "firebase-admin";

function rowyUser(user: admin.auth.UserRecord) {
  return {
    displayName: user?.displayName,
    email: user?.email,
    uid: user?.uid,
    emailVerified: user?.emailVerified,
    photoURL: user?.photoURL,
    timestamp: new Date(),
  };
}

async function insertErrorToStreamer(errorRecord: any, streamLogger:any) {
  let errorString = "";
  for (const key of [
    "command",
    "description",
    "functionConfigTs",
    "sparksConfig",
    "stderr",
    "errorStackTrace",
  ]) {
    const value = errorRecord[key];
    if (value) {
      errorString += `\n\n${key}: ${value}`;
    }
  }
  await streamLogger.error(errorString);
}

function commandErrorHandler(
  meta: {
    user: admin.auth.UserRecord;
    description?: string;
    functionConfigTs?: string;
    sparksConfig?: string;
  },
  streamLogger:any
) {
  return async function (error:any, stdout:any, stderr:any) {
    await streamLogger.info(stdout);

    if (!error) {
      return;
    }

    const errorRecord = {
      errorType: "commandError",
      ranBy: rowyUser(meta.user),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      stdout: stdout ?? "",
      stderr: stderr ?? "",
      errorStackTrace: error?.stack ?? "",
      command: error?.cmd ?? "",
      description: meta?.description ?? "",
      functionConfigTs: meta?.functionConfigTs ?? "",
      sparksConfig: meta?.sparksConfig ?? "",
    };
    await insertErrorToStreamer(errorRecord, streamLogger);
  };
}

async function logErrorToDB(
  data: {
    errorDescription: string;
    errorExtraInfo?: string;
    errorTraceStack?: string;
    user: admin.auth.UserRecord;
    sparksConfig?: string;
  },
  streamLogger:any
) {
  console.error(data.errorDescription);

  const errorRecord = {
    errorType: "codeError",
    ranBy: rowyUser(data.user),
    description: data.errorDescription,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    sparksConfig: data?.sparksConfig ?? "",
    errorExtraInfo: data?.errorExtraInfo ?? "",
    errorStackTrace: data?.errorTraceStack ?? "",
  };
  if (streamLogger) {
    await insertErrorToStreamer(errorRecord, streamLogger);
  }
}

function parseSparksConfig(
  sparks: string | undefined,
  user: admin.auth.UserRecord,
  streamLogger:any
) {
  if (sparks) {
    try {
      // remove leading "sparks.config(" and trailing ")"
      return sparks
        .replace(/^(\s*)sparks.config\(/, "")
        .replace(/\);?\s*$/, "");
    } catch (error:any) {
      logErrorToDB(
        {
          errorDescription: "Sparks is not wrapped with sparks.config",
          errorTraceStack: error.stack,
          user,
          sparksConfig: sparks,
        },
        streamLogger
      );
    }
  }

  return "[]";
}

async function createStreamLogger(tableConfigPath: string) {
  const startTimeStamp = Date.now();
  const fullLog: {
    log: string;
    level: "info" | "error";
    timestamp: number;
  }[] = [];
  const logRef = db
    .doc(tableConfigPath)
    .collection("ftBuildLogs")
    .doc(startTimeStamp.toString());
  await logRef.set({ startTimeStamp, status: "BUILDING" });

  console.log(
    `streamLogger created. tableConfigPath: ${tableConfigPath}, startTimeStamp: ${startTimeStamp}`
  );

  return {
    info: async (log: string) => {
      console.log(log);
      fullLog.push({
        log,
        level: "info",
        timestamp: Date.now(),
      });
      await logRef.update({
        fullLog,
      });
    },
    error: async (log: string) => {
      console.error(log);
      fullLog.push({
        log,
        level: "error",
        timestamp: Date.now(),
      });
      await logRef.update({
        fullLog,
      });
    },
    end: async () => {
      const logsDoc = await logRef.get();
      const errorLog = logsDoc
        .get("fullLog")
        .filter((log:any) => log.level === "error");
      if (errorLog.length !== 0) {
        console.log("streamLogger marked as FAIL");
        await logRef.update({
          status: "FAIL",
          failTimeStamp: Date.now(),
        });
      } else {
        console.log("streamLogger marked as SUCCESS");
        await logRef.update({
          status: "SUCCESS",
          successTimeStamp: Date.now(),
        });
      }
    },
    fail: async () => {
      console.log("streamLogger marked as FAIL");
      await logRef.update({
        status: "FAIL",
        failTimeStamp: Date.now(),
      });
    },
  };
}

export {
  commandErrorHandler,
  logErrorToDB,
  parseSparksConfig,
  createStreamLogger,
};
