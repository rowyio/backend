import { db } from "../firebaseConfig";
import chalk from "chalk";
import { logo } from "../asciiLogo";
async function start() {
  const rowyRunUrl = process.env.SERVICE_URL;
  const rowyAppURL = `https://${process.env.GOOGLE_CLOUD_PROJECT}.rowy.app/setup?rowyRunUrl=${process.env.SERVICE_URL}`;
  const update = {
    rowyRunBuildStatus: "COMPLETE",
    rowyRunUrl,
  };
  await db.doc("/_rowy_/settings").update(update);
  console.log(chalk.green("Successfully created rowy app"));
  console.log(logo);
  console.log(
    `
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
    +  Continue the setup process by going to the link bellow     +
    +  ${rowyAppURL}
    ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++`
  );
}

start();
