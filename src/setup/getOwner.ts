import { db } from "../firebaseConfig";
export const getOwner = async () => {
  const userManagementDoc = await db.doc("_rowy_/userManagement").get();
  return userManagementDoc.get("owner");
};
