import { db } from "../firebaseConfig";
import { Request } from "express";
import { serializeWebhooks } from "./serializer";
import { WEBHOOKS_DOC_PATH } from "./constants";

export const publishWebhooks = async (req: Request) => {
  const { tableConfigPath, tablePath } = req.body;
  const tableWebhooksConfig = (await db.doc(tableConfigPath).get()).get(
    "webhooks"
  );
  const serializedWebhooks = serializeWebhooks(tableWebhooksConfig, tablePath);
  await db
    .doc(WEBHOOKS_DOC_PATH)
    .set(
      { [encodeURIComponent(tableConfigPath)]: serializedWebhooks },
      { merge: true }
    );
  return { success: true, message: "webhooks successfully published" };
};
