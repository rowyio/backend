import { db } from "../firebaseConfig";
const config = require("../../rowyConfig.json");
export const region = async () => {
  if (config.region) {
    return { region: config.region };
  } else {
    try {
      const settings = await db.doc("_rowy_/settings").get();
      return { region: settings.data().rowyRunRegion };
    } catch (error) {
      return { region: null };
    }
  }
};
