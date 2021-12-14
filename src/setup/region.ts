import { db } from "../firebaseConfig";
export const region = async () => {
  try {
    const settings = await db.doc("_rowy_/settings").get();
    return { region: settings.data().rowyRunRegion };
  } catch (error) {
    return { region: null };
  }
};
