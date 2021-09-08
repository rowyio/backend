import {db} from '../firebaseConfig'

async function start() {
    const update = {
        rowyRunBuildStatus: "COMPLETE",
        rowyRunUrl: process.env.SERVICE_URL
    }
    await db.doc("/_rowy_/settings").update(update)
}

start();