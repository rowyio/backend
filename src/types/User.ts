export type User = {
  name: string;
  picture: string;
  roles: string[];
  iss: string;
  aud: string;
  auth_time: number;
  user_id: string;
  sub: string;
  iat: number;
  exp: number;
  email: string;
  email_verified: boolean;
  firebase: {
    identities: any;
    sign_in_provider: string;
  };
  uid: string;
};
