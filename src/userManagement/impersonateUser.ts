import { auth, db } from '../firebaseConfig'
import { Request, Response } from 'express'
import { rowyUsersImpersonationLogs } from '../constants/Collections';
export const impersonateUser = async (req: Request, res: Response) => {
  try {
    const authHeader = req.get('Authorization') as string;
    const authToken = authHeader.split(' ')[1];
    const {uid} = await auth.verifyIdToken(authToken);
    const { email } = req.body;
    // check if user exists
    const user = await auth.getUserByEmail(email);
    const token = await auth.createCustomToken(user.uid);
    await db.collection(rowyUsersImpersonationLogs).add({
        createdAt: new Date(),
        impersonatedUid: user.uid,
        impersonatedUserEmail: email,
        impersonatorUid:uid,
    })

    res.send({ success: true ,token});

  } catch (error) {
    res.send({ error,success: false });
  }
}