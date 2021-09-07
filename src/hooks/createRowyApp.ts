const client = require("firebase-tools")
import { httpsPost } from '../utils'
const getRowyApp = (projectId:string) =>
  new Promise((resolve) => {
    const getSDKConfig = (appId:string) =>
      client.apps.sdkconfig("web", appId, { project: projectId });
    client.apps
      .list("WEB", { project: projectId })
      .then((data:{displayName:string,appId:string}[]) => {
        const filteredConfigs = data.filter(
          (config) => config.displayName === "rowyApp"
        );
        if (filteredConfigs.length === 0) {
          client.apps
            .create("WEB", "rowyApp", { project: projectId })
            .then((newApp:{appId:string}) => {
              getSDKConfig(newApp.appId).then((config:any) => {
                resolve(config.sdkConfig);
              });
            })
            .catch((err:any) => {
              console.error(err);
            });
        } else {
          getSDKConfig(filteredConfigs[0].appId).then((config:any) => {
            resolve(config.sdkConfig);
          });
        }
      })
      .catch((err:any) => {
        console.error(err);
      });
  });


const registerRowyApp = async (firebaseConfig:any)=> httpsPost({
      hostname:'us-central1-rowy-service.cloudfunctions.net',
      path: `/addProject`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body:{
          firebaseConfig
      }
    })
  
export const createRowyApp = async (projectId:string)=>{
   
    try {
        const firebaseConfig = await getRowyApp(projectId)
       const {secret,success,message}:any = await registerRowyApp(firebaseConfig)
       if(!success) throw new Error(message);
       let rowyService = require('../../rowy-service.json')
       rowyService.secret = secret
       require('fs').writeFileSync('../../rowy-service.json',JSON.stringify(rowyService,null,2))
      
      } catch (error) {
        console.log(error)
    }
}
