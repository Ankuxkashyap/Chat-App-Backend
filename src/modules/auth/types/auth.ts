import { Request } from 'express';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  username: string;
};

export type JwtPayload = {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
};

export interface RequestT extends Request {
  user: AuthUser;
  access_token:string;
  refresh_token:string;
}
