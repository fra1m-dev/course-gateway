import { Role } from 'src/common/decorators/roles-auth.decorator';

export type UserModel = {
  sub: number;
  email: string;
  name: string;
  role: Role;
  specializationId?: number | null;
};
