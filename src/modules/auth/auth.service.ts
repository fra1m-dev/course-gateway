//TODO: Проверить название патернов. Провить их логику в микросервисе auth

import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { Tokens } from './models/auth-model';
import { PATTERNS } from 'src/contracts/patterns';
import { UserModel } from '../users/models/user-model';

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_CLIENT) private readonly auth: ClientProxy) {}

  // async createHash(
  //   meta: { requestId: string },
  //   password: string,
  // ): Promise<string> {
  //   return await rpc<string>(this.auth, PATTERNS.AUTH_HASH, { meta, password });
  // }

  async authByPassword(
    meta: { requestId: string },
    params: { userId: number; password: string },
  ): Promise<Tokens> {
    return await rpc<Tokens>(this.auth, PATTERNS.AUTH_LOGIN_BY_PASSWORD, {
      meta,
      ...params,
    });
  }

  async createCredentials(
    meta: { requestId: string },
    params: { userId: number; password: string },
  ): Promise<{ ok: true }> {
    return await rpc<{ ok: true }>(this.auth, PATTERNS.AUTH_CREDENTIALS, {
      meta,
      ...params,
    });
  }

  async generateTokens(
    meta: { requestId: string },
    user: UserModel,
  ): Promise<Tokens> {
    return await rpc<Tokens>(this.auth, PATTERNS.AUTH_GENERATE_TOKENS, {
      meta,
      user,
    });
  }
}
