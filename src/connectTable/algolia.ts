import { User } from "../types/User";
import { Request } from "express";
export const getAlgoliaSearchKey = (req: Request, user: User) => {
  try {
    // check if environment variable is set
    const algoliasearch = require("algoliasearch");
    const algoliaClient = algoliasearch(
      process.env.ALGOLIA_APPLICATION_ID,
      process.env.ALGOLIA_ADMIN_KEY
    );
    const { index } = req.params;
    if (!index) throw new Error("Index is required");
    const userRoles = user.roles;
    if (!userRoles || userRoles.length === 0)
      throw new Error("User has no roles");
    // const allIndicesRoles = ['ADMIN',"TEAM"] // you can add more roles here that need access to all algolia indices
    // const rolesIndicesAccess = {
    //   "ROLE":["index_1","index_2"]
    // }
    // const userRoles = context.auth.token.roles
    // if (userRoles.some(role=> allIndicesRoles.includes(role)||rolesIndicesAccess[role].includes(requestedIndex))){
    const validUntil = Math.floor(Date.now() / 1000) + 3600;
    const key = algoliaClient.generateSecuredApiKey(
      process.env.ALGOLIA_SEARCH_KEY,
      {
        filters: "",
        validUntil,
        restrictIndices: [index],
        userToken: user.uid,
      }
    );
    return {
      key,
      success: true,
    };
  } catch (error: any) {
    return {
      success: false,
      error,
      message: error.message,
    };
  }
};
