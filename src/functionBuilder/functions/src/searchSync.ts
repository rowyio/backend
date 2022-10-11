import * as functions from "firebase-functions";
import fetch from "node-fetch";
import rowy from "./rowy";

const searchSync =
  (
    indices: {
      id: string;
      fields: string[];
    }[],
    triggerType: "create" | "update" | "delete",
    host: string
  ) =>
  async (change: functions.Change<functions.firestore.DocumentSnapshot>) => {
    try {
      const masterKey = await rowy.secrets.get("meilisearchMasterKey");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${masterKey}`,
      };
      if (triggerType === "delete") {
        const docId = change.before.id;
        return indices.map(async (index) => {
          const url = `${host}/indexes/${index.id}/documents`;
          return fetch(url + `/${docId}`, { headers, method: "DELETE" });
        });
      } else {
        const row = change.after.data();
        const docId = change.after.id;

        return indices.map(async (index) => {
          const data = index.fields.reduce(
            (acc, curr) => ({ ...acc, [curr]: row[curr] }),
            {}
          );
          const url = `${host}/indexes/${index.id}/documents`;
          const body = JSON.stringify({
            id: docId,
            ...data,
            _rowy_ref: {
              id: docId,
              path: change.after.ref.path,
            },
          });

          return fetch(url + `?primaryKey=id`, {
            body,
            headers,
            method: "POST",
          });
        });
      }
    } catch (error: any) {
      console.error(error);
      return false as any;
    }
  };

export default searchSync;
