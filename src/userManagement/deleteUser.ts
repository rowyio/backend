import { auth, db } from "../firebaseConfig";
import { Request, Response } from "express";
import { rowyUsers } from "../constants/Collections";
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    // check if user exists
    const userQuery = await db
      .collection(rowyUsers)
      .where("user.email", "==", email)
      .get();
    if (userQuery.docs.length === 0) {
      throw new Error("User does not exist");
    }
    const userDoc = userQuery.docs[0];
    await userDoc.ref.delete();
    try {
      await auth.deleteUser(userDoc.id);
    } catch (error) {
      console.log(error);
    }
    res.send({ success: true });
  } catch (error: any) {
    res.send({ error: error.message });
  }
};
