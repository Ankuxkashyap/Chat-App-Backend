type User = {
  id: string;
  name: string;
  email: string;
  username: string;
};
export interface RequestT extends Request {
  user: User;
}
