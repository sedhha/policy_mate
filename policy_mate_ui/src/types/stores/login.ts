export interface User {
  username: string;
  email: string;
  id: string;
  raw: Record<string, unknown>;
}
export interface IUserState {
  idToken?: string;
  user?: User;
  setUser: (user: User) => void;
  setIdToken: (idToken: string) => void;
}

export interface DecodedToken {
  sub?: string;
  email?: string;
  name?: string;
  [key: string]: any;
}
