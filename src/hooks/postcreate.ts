import * as admin from "firebase-admin"

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function start() {
    const update = {
        rowyRunBuildStatus: "COMPLETE",
        rowyRunUrl: process.env.SERVICE_URL
    }
    console.log(update)
    await db.doc("/_rowy_/settings").update(update)
}

start();