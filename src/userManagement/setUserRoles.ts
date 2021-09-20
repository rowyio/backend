import { auth, db } from "../firebaseConfig";
import { Request, Response } from "express";
import { rowyUsers } from "../constants/Collections";
export const setUserRoles = async (req: Request, res: Response) => {
  try {
    const { email, roles } = req.body;
    // check if user exists
    const userQuery = await db
      .collection(rowyUsers)
      .where("user.email", "==", email)
      .get();
    if (userQuery.docs.length === 0) {
      throw new Error("User does not exist");
    }
    const uid = userQuery.docs[0].id;
    await Promise.all([
      userQuery.docs[0].ref.update({ roles }),
      auth.setCustomUserClaims(uid, { roles }),
    ]);
    res.send({ success: true });
  } catch (error: any) {
    res.send({ error: error.message });
  }
};
