import { Request, Response } from "express";
import { db } from "../firebaseConfig";
import { WEBHOOKS_DOC_PATH } from "./constants";
import { Logging } from "@google-cloud/logging";
import { getProjectId } from "../metadataService";

const crypto = require("crypto");
let endpoints = null;
const setEndpoints = async (snapshot) => {
  const docData = snapshot.data();
  if (!docData) {
    endpoints = [];
    return;
  }
  const values = Object.values(docData);
  if (values && values.length !== 0) {
    endpoints = eval(`[${values.join(",")}]`);
  } else endpoints = [];
};
db.doc(WEBHOOKS_DOC_PATH).onSnapshot(setEndpoints);

// functions to verify request signature
const verifiers = {
  typeform: function (request, secret) {
    const signature = request.headers["typeform-signature"];
    const hash = crypto
      .createHmac("sha256", secret)
      .update(request.body)
      .digest("base64");
    console.log(secret, signature, `sha256=${hash}`, request.body.toString());
    return signature === `sha256=${hash}`;
  },
};

// See: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity
const severities = {
  "200": "INFO",
  "404": "WARNING",
  "401": "WARNING",
  "500": "ERROR",
};

const logEvent = async (request: Request, code: string, error?: string) => {
  const { headers, url, params, body, query } = request;
  const projectId = await getProjectId();
  const logging = new Logging({ projectId });
  // Selects the log to write to
  const log = logging.log(`rowy-webhook-events`);
  // The data to write to the log
  // The metadata associated with the entry
  const metadata = {
    resource: {
      type: "global",
    },
    severity: severities[code],
  };
  // Prepares a log entry
  //JSON.stringify()
  const entry = log.entry(metadata, {
    headers,
    url,
    params,
    body,
    query,
    error,
  });
  return log.write(entry);
};

export const webhooksConsumer = async (req: Request, res: Response) => {
  const { url } = req;
  try {
    if (!endpoints) {
      const snapshot = await db.doc(WEBHOOKS_DOC_PATH).get();
      await setEndpoints(snapshot);
    }
    const endpoint = endpoints.find(function (o) {
      return o.url === url;
    });
    if (!endpoint) throw Error("404");
    if (
      endpoint.secret &&
      endpoint.secret !== "" &&
      verifiers[endpoint.type] &&
      !verifiers[endpoint.type](req, endpoint.secret)
    ) {
      throw Error("401");
    }
    const ref = db.collection(endpoint.tablePath);
    const condition = await endpoint.conditions({ req, db, ref });
    if (!condition) return res.sendStatus(412);
    const newRow = await endpoint.parser({ req, db, ref });

    // const logEvent = db.collection(`${WEBHOOKS_DOC_PATH}/logs`).add({
    //   createdAt: new Date(),
    //   body,
    //   headers,
    //   url,
    //   params,
    //   response: "200",
    // });

    if (newRow) await Promise.all([ref.add(newRow), logEvent(req, "200")]);
    else await logEvent(req, "200");
    return res.sendStatus(200);
  } catch (error: any) {
    const errorCode = error.message.length === 3 ? error.message : "500";
    console.error(error.message);
    await logEvent(req, errorCode, error.message);
    return res.sendStatus(errorCode);
  }
};
