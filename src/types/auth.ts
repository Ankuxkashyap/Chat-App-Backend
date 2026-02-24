import { Request } from 'express';

interface User {
  id: string;
  username: string;
  email: string;
}

interface AuthenticatedRequest extends Request {
  user: User;
}

export type { AuthenticatedRequest, User };
