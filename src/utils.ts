import  https from 'https'
import { auth } from './firebaseConfig';

export const hasRoles = (roles: string[]) => async (req: any, res: any, next: Function) => {
  try {
    const authHeader = req.get('Authorization');
    if (!authHeader) return res.status(401).send('Unauthorized');
    const authToken = authHeader.split(' ')[1];

    const decodedToken = await auth.verifyIdToken(authToken);
    const uid = decodedToken.uid;
    const user = await auth.getUser(uid);
    const userRoles :string[] = user.customClaims.roles;
    // user roles must have at least one of the roles
    const authorized = roles.some(role => userRoles.includes(role));
    if (authorized) {
      res.locals.user = user;
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
