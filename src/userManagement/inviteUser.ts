import { auth, db } from "../firebaseConfig";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { rowyUsers } from "../constants/Collections";
import { httpsPost } from "../utils";
import { getProjectId } from "../metadataService";
export const inviteUser = async (req: Request, res: Response) => {
  try {
    const inviterUser: admin.auth.UserRecord = res.locals.user;
    const { email, roles } = req.body;
    const projectId = await getProjectId();
    // check if user exists
    const userQuery = await db
      .collection(rowyUsers)
      .where("email", "==", email)
      .get();
    if (userQuery.docs.length !== 0) {
      throw new Error("User already exists");
    }
    const user = await auth.getUserByEmail(email);
    if (!user) {
      // create user
      const newUser = await auth.createUser({
        email,
      });
      // roles
      auth.setCustomUserClaims(newUser.uid, { roles });
      // send email
      const resp = await httpsPost({
        hostname: "rowy.run",
        path: `/inviteUser`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          projectId,
          secret: process.env.ROWY_SECRET,
          newUser: {
            email,
            uid: newUser.uid,
            roles,
            inviter: {
              email: inviterUser.email,
              uid: inviterUser.uid,
              displayName: inviterUser.displayName,
            },
          },
        },
      });
      console.log(resp);
    }
    res.send({ success: true });
  } catch (error: any) {
    res.send({ error: error.message });
  }
};
