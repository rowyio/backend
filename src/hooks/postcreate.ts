import {db} from '../firebaseConfig'

async function start() {
    console.log('postcreate')
    try {
        const update = {
            rowyRunBuildStatus: "COMPLETE",
            rowyRunUrl: process.env.SERVICE_URL
        }
        await db.doc("/_rowy_/settings").update(update)  
    } catch (error) {
        console.log(error)
    }

}

start();