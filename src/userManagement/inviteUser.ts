import { auth, db } from "../firebaseConfig";
import { Request, Response } from "express";
import { rowyUsers } from "../constants/Collections";
import { getProjectId } from "../metadataService";
import { User } from "../types/User";
import { inviteUserService } from "../rowyService";

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
    const existingCustomClaims = user.customClaims ?? {};
    await auth.setCustomUserClaims(user.uid, {
      ...existingCustomClaims,
      roles,
    });
    // send email
    const newUser = {
      email,
      uid: user.uid,
      roles,
    };
    const inviter = {
      email: inviterUser.email,
      uid: inviterUser.uid,
      name: inviterUser.name,
    };
    await inviteUserService(projectId, newUser, inviter);
    return res.send({ success: true });
  } catch (error: any) {
    return res.send({ error: error.message });
  }
};
