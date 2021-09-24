import { auth } from "../firebaseConfig";

export const requireAuth = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.get("Authorization");
    if (!authHeader) return res.status(401).send("Unauthorized");
    const authToken = authHeader.split(" ")[1];
    const decodedToken = await auth.verifyIdToken(authToken);
    res.locals.user = decodedToken;
    next();
  } catch (error) {
    console.error(error);
    res.status(401).send({ error });
  }
};

export const hasAnyRole =
  (roles: string[]) => async (req: any, res: any, next: Function) => {
    try {
      const user = res.locals.user;
      const userRoles: string[] = user.roles;
      // user roles must have at least one of the roles
      const authorized = roles.some((role) => userRoles.includes(role));
      if (authorized) {
        next();
      } else {
        const latestUser = await auth.getUser(user.uid);
        const authDoubleCheck = roles.some((role) =>
          latestUser.customClaims.roles.includes(role)
        );
        if (authDoubleCheck) {
          next();
        } else {
          res.status(401).send({
            error: "Unauthorized",
            message: "User does not have any of the required roles",
            roles,
          });
        }
      }
    } catch (err) {
      res.status(401).send({ error: err });
    }
  };
