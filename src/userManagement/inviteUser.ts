import { auth, db } from "../firebaseConfig";
import { Request, Response } from "express";
import { rowyUsers } from "../constants/Collections";
import { httpsPost } from "../utils";
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
          email,
          uid: newUser.uid,
          roles,
        },
      });
      console.log(resp);
    }
    res.send({ success: true });
  } catch (error: any) {
    res.send({ error: error.message });
  }
};
