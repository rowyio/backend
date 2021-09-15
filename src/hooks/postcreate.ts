import { db } from "../firebaseConfig";
import chalk from "chalk";
async function start() {
  console.log("postcreate");
  try {
    const update = {
      rowyRunBuildStatus: "COMPLETE",
      rowyRunUrl: process.env.SERVICE_URL,
    };
    await db.doc("/_rowy_/settings").update(update);
    console.log(chalk.green("Successfully created rowy app"));
    const rowyAppURL = `https://${process.env.GOOGLE_CLOUD_PROJECT}.rowy.app/setup?rowyRunUrl=${process.env.SERVICE_URL}`;
    console.log(
      chalk
        .hex("#4200ff")
        .bold(`Open ${rowyAppURL} to continue the setup process`)
    );
  } catch (error) {
    console.log(error);
  }
}

start();
