import {auth} from './firebaseConfig';
// validate User role from token
/**
 * will return true if user has atleast on of the required roles
 * @param token 
 * @param roles 
 * @returns 
 */
const userHasARequiredRole = async (token: string, roles: string[]) => {
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const user = await auth.getUser(uid);
    const userRoles = user?.customClaims?.roles;
    // user roles must have at least one of the roles
    return roles.some(role => userRoles?.includes(role));
}
export const restrictedRequest =(roles:string[])=> async (req: any,res:any, next:Function) => {
    const auth = req.get('Authorization');
    if(!auth)return res.status(401).send('Unauthorized');
    const authToken = auth?.split(' ')[1];
    const authorized = await userHasARequiredRole(authToken,roles)
    if(authorized){
      next();
    }else{
      res.status(401).send({error: 'Unauthorized'});
    }
  }
  