import { auth, db } from "../firebaseConfig";
import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { rowyUsers } from "../constants/Collections";
import { httpsPost } from "../utils";
import { getProjectId } from "../metadataService";
import { User } from "../types/User";

const getFirebaseAuthUser = async (email: string) => {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    return false;
  }
};

export const inviteUser = async (req: Request, res: Response) => {
  try {
    const inviterUser: User = res.locals.user;
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
    // check if user already exists in firebase
    let user = await getFirebaseAuthUser(email);
    if (!user) {
      // create user
      user = await auth.createUser({
        email,
      });
    }
    // roles
    await auth.setCustomUserClaims(user.uid, { roles });
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
          uid: user.uid,
          roles,
        },
        inviter: {
          email: inviterUser.email,
          uid: inviterUser.uid,
          name: inviterUser.name,
        },
      },
    });
    console.log(resp);
    return res.send({ success: true });
  } catch (error: any) {
    return res.send({ error: error.message });
  }
};
