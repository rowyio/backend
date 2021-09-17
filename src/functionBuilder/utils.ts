import admin from "firebase-admin";

export function rowyUser(user: admin.auth.UserRecord) {
  return {
    displayName: user?.displayName,
    email: user?.email,
    uid: user?.uid,
    emailVerified: user?.emailVerified,
    photoURL: user?.photoURL,
    timestamp: new Date(),
  };
}

export const getCollectionType = (pathname: string) => {
  const [route, path] = pathname.split("/");
  if (route === "table") {
    const decodedPath = decodeURIComponent(path);
    if (decodedPath.includes("/")) {
      return "subCollection";
    } else return "collection";
  } else if (route === "tableGroup") return "collectionGroup";
  else return null;
};

export const getCollectionPath = (collectionType, pathname, tables) => {
  switch (collectionType) {
    case "collection":
      return tables.find(
        (t: any) =>
          t.id === pathname.split("/")[1] && t.tableType === "primaryCollection"
      ).collection;
    case "collectionGroup":
      return tables.find(
        (t: any) =>
          t.id === pathname.split("/")[1] && t.tableType === "collectionGroup"
      ).collection;
    default:
      break;
  }
};

export const getFunctionName = (
  collectionType: string,
  collectionPath: string,
  depth?: number
) => {
  switch (collectionType) {
    case "collection":
      return `${collectionPath}`;
    case "collectionGroup":
      return `CG_${collectionPath}_D${depth}`;
    default:
      return "";
  }
};
export const getTriggerPath = (
  collectionType: string,
  collectionPath: string,
  depth?: number
) => {
  let triggerPath = "";
  switch (collectionType) {
    case "collection":
      return `"${collectionPath}/{docId}"`;
    case "groupCollection":
      triggerPath = "";
      for (let i = 1; i <= depth; i++) {
        triggerPath = triggerPath + `{parentCol${i}}/{parentDoc${i}}/`;
      }
      triggerPath = triggerPath + collectionPath + "/" + "{docId}";
      return triggerPath;
    default:
      return "";
  }
  triggerPath;
};
