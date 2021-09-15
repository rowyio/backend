import { auth, db } from "../firebaseConfig";
import { Request, Response } from "express";
import { rowyUsers } from "../constants/Collections";
export const inviteUser = async (req: Request, res: Response) => {
  try {
    const { email, roles } = req.body;
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
        displayName: email,
        disabled: false,
      });
      // roles
      auth.setCustomUserClaims(newUser.uid, { roles });
    }
    res.send({ success: true });
  } catch (error: any) {
    res.send({ error: error.message });
  }
};
