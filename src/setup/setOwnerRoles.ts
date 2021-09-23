import { Request, Response } from "express";
import { auth, db } from "../firebaseConfig";
export const setOwnerRoles = async (req: Request, res: Response) => {
  try {
    const userManagementDoc = await db.doc("_rowy_/userManagement").get();
    const userToken = res.locals.user;
    const user = await auth.getUser(userToken.uid);
    const ownerEmail = userManagementDoc.get("owner.email");
    if (user.email !== ownerEmail)
      return res.send({
        success: false,
        message: "Logged in user is not the owner",
        ownerEmail,
        userEmail: user.email,
      });
    await auth.setCustomUserClaims(user.uid, {
      ...user.customClaims,
      roles: ["ADMIN", "OWNER"],
    });
    const updatedUser = await auth.getUser(user.uid);
    return res.send({
      success: true,
      ownerEmail,
      user,
      newClaims: updatedUser.customClaims,
    });
  } catch (error) {
    return res.send({ success: false, error: error });
  }
};
