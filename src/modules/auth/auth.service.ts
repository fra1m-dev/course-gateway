//TODO: Проверить название патернов: 'auth.createCredentials', 'auth.issueTokens', 'auth.hash'. Провить их логику в микросервисе auth
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { Tokens } from './models/auth-model';

@Injectable()
export class AuthService {
  constructor(@Inject(AUTH_CLIENT) private readonly auth: ClientProxy) {}

  async createHash(
    meta: { requestId: string },
    password: string,
  ): Promise<string> {
    return await rpc<string>(this.auth, 'auth.hash', { password, meta });
  }

  async createCredentials(
    meta: { requestId: string },
    params: { userId: number; passwordHash: string },
  ): Promise<{ ok: true }> {
    return await rpc<{ ok: true }>(this.auth, 'auth.createCredentials', {
      ...params,
      meta,
    });
  }

  async generateTokens(
    meta: { requestId: string },
    user: { id: number; email: string },
  ): Promise<Tokens> {
    return await rpc<Tokens>(this.auth, 'auth.issueTokens', {
      userId: user.id,
      email: user.email,
      meta,
    });
  }
}
