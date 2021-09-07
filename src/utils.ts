import  https from 'https'
import { auth } from './firebaseConfig';
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
export const restrictedRequest = (roles: string[]) => async (req: any, res: any, next: Function) => {
  try {
    const auth = req.get('Authorization');
    if (!auth) return res.status(401).send('Unauthorized');
    const authToken = auth?.split(' ')[1];
    const authorized = await userHasARequiredRole(authToken, roles)
    if (authorized) {
      next();
    } else {
      res.status(401).send({ error: 'Unauthorized' });
    }
  } catch (err) {
    res.status(401).send({ error:err });
  }
}
export function httpsPost({body, ...options}:any){
  return new Promise((resolve,reject) => {
      const req = https.request({
          method: 'POST',
          ...options,
      }, res => {
        res.setEncoding('utf8')
        let body = ''
        res.on('data', chunk => {
            body += chunk
        })
        res.on('end', () => {
            resolve(JSON.parse(body))
        })
      })
      req.on('error',reject);
      if(body) {
          req.write(JSON.stringify(body));
      }
      req.end();
  })
}
