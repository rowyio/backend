import { db } from "../firebaseConfig";
export const region = async () => {
  const settings = await db.doc("_rowy_/settings").get();
  return { region: settings.data().rowyRunRegion };
};
