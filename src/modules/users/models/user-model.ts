import { Role } from '@fra1m-dev/contracts-auth';

export type UserModel = {
  id: number;
  email: string;
  name: string;
  role: Role;
};
