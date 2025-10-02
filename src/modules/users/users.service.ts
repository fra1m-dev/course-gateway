//TODO: Проверить название патернов. Провить их логику в микросервисе users

import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ClientProxy } from '@nestjs/microservices';
import { USERS_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { UserModel } from './models/user-model';
import { PATTERNS } from 'src/contracts/patterns';
import { AuthUserDto } from './dto/authUser.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(USERS_CLIENT) private readonly users: ClientProxy) {}

  async getByEmail(
    meta: { requestId: string },
    authUserDto: Omit<AuthUserDto, 'password'>,
  ): Promise<UserModel> {
    const exists = await rpc<UserModel>(this.users, PATTERNS.USERS_BY_EMAIL, {
      meta,
      authUserDto,
    });

    return exists;
  }

  async createUser(
    meta: { requestId: string },
    createUserDto: Omit<CreateUserDto, 'password'>,
  ): Promise<UserModel> {
    const exists = await rpc<UserModel>(this.users, PATTERNS.USERS_CREATE, {
      meta,
      createUserDto,
    });

    return exists;
  }
}
