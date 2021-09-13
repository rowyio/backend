
import { createRowyApp } from "./createRowyApp"
import { getGCPEmail,updateConfig } from "./utils"
import chalk from 'chalk'
import {db} from '../firebaseConfig'
const projectId = process.env.GOOGLE_CLOUD_PROJECT


async function start() {
    if (!projectId) {
        throw new Error("GOOGLE_CLOUD_PROJECT env variable is not set")
    }
    updateConfig('projectId',projectId)
    const settings = {
        rowyRunBuildStatus: "BUILDING",
        rowyRunRegion: process.env.GOOGLE_CLOUD_REGION,
    }
    await db.doc("_rowy_/settings").set(settings, { merge: true })
    await createRowyApp(projectId)
    const gcpEmail = await getGCPEmail()
    if (typeof gcpEmail !== "string") {
        throw new Error("cloud shell ")
    }
    const userManagement = {
        owner: {
            email: gcpEmail
        }
    }
    await db.doc("_rowy_/userManagement").set(userManagement, { merge: true })
    const publicSettings = {
        signInOptions: [
            "google"
        ]
    }
    await db.doc("_rowy_/publicSettings").set(publicSettings, { merge: true })
    console.log(chalk.green("Successfully created rowy app"))
    const rowyAppURL = `https://${projectId}.rowy.app/setup`
    console.log(chalk.hex('#4200ff').bold(`Open ${rowyAppURL} to get started`))
}

start();