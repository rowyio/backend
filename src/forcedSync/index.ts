import { db, auth } from "../firebaseConfig";
import { getExtension } from "../rowyService";

type ForcedSyncRequest = {
  type: "extension" | "derivative" | "defaultValue";
  index: number;
  functionsDocPath: string;
};

export const forcedSync = async (req) => {
  const { functionsDocPath, type, index }: ForcedSyncRequest = req.body;
  const functionsDoc = await db.doc(functionsDocPath).get();
  const functionsSnapshot = functionsDoc.data();
  const { collectionType, collectionPath } = functionsSnapshot;
  const config = functionsSnapshot[type][index];
  const collectionRef =
    collectionType === "collectionGroup"
      ? db.collectionGroup(collectionPath)
      : db.collection(collectionPath);

  switch (type) {
    case "extension":
      const extensionResp = await getExtension(type);
      const { extension, dependencies, syncScript } = extensionResp;

      const extensionContext = { db, auth };

      if (!syncScript) throw new Error("No sync script available");
      const requiredFields: string[] = config.requiredFields;
      const collectionQuery = await collectionRef.get();
      const collection = collectionQuery.docs;
      // filter only the documents that have the required fields
      const filteredCollection =
        requiredFields && requiredFields.length !== 0
          ? collection.filter((doc) => {
              const docFields = Object.keys(doc.data());
              const missingFields = requiredFields.filter(
                (field) => !docFields.includes(field)
              );
              return missingFields.length === 0;
            })
          : collection;
      const extensionBodies = await filteredCollection.map((doc) => {
        const row = doc.data();
        const ref = doc.ref;
      });
      const syncScriptResult = await eval(syncScript)(filteredCollection);
      return {
        success: true,
        message: `${collectionType} ${collectionPath} ${type} ${config.label} synced successfully`,
      };
    case "derivative":
      const derivativeScript = "";
    case "defaultValue":

    default:
      return {
        success: false,
        message: `${type} is not a valid type`,
      };
  }
};
