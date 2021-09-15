import { auth, db } from "../firebaseConfig";
import { Request, Response } from "express";
import { rowyUsersImpersonationLogs } from "../constants/Collections";
export const impersonateUser = async (req: Request, res: Response) => {
  try {
    const impersonator = res.locals.user;
    const { email } = req.params;
    // check if user exists
    const user = await auth.getUserByEmail(email);
    const token = await auth.createCustomToken(user.uid);
    await db.collection(rowyUsersImpersonationLogs).add({
      createdAt: new Date(),
      impersonatedUid: user.uid,
      impersonatedUserEmail: email,
      impersonatorUid: impersonator.uid,
      impersonatorEmail: impersonator.email,
    });
    res.send({
      success: true,
      token,
      message: `Authenticating as ${user.displayName}`,
    });
  } catch (error) {
    res.send({ error, success: false });
  }
};
