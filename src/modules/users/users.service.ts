//TODO: Проверить название патернов: 'users.getByEmail', 'users.create'. Провить их логику в микросервисе auth

import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { ClientProxy } from '@nestjs/microservices';
import { USERS_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { UserModel } from './models/user-model';

@Injectable()
export class UsersService {
  constructor(@Inject(USERS_CLIENT) private readonly users: ClientProxy) {}

  //TODO: Возможно нужно чтобы { email: string } вместо { email: Pick<CreateUserDto, 'email'> }
  async getByEmail(
    meta: { requestId: string },
    email: Pick<CreateUserDto, 'email'>,
  ): Promise<UserModel | null> {
    const exists = await rpc<UserModel | null>(this.users, 'users.getByEmail', {
      email,
      meta,
    });

    return exists;
  }

  async createUser(
    meta: { requestId: string },
    createUserDto: Omit<CreateUserDto, 'password'>,
  ): Promise<UserModel> {
    const exists = await rpc<UserModel>(this.users, 'users.create', {
      dto: createUserDto,
      meta,
    });

    return exists;
  }
}
