import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  // SubscribeMessage,
  // MessageBody,
  // ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { AuthService } from 'src/modules/auth/auth.service';
import { UsersService } from '../users/users.service';
import { AppLogger } from 'src/common/logger/logger.service';

@Injectable()
@WebSocketGateway({
  namespace: '/ws', // 👈 фронт подключается к /ws
  path: '/socket.io', // по умолчанию так и есть, указал явно
  transports: ['websocket', 'polling'],
  cors: { origin: true, credentials: true },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private readonly log = new Logger(NotificationsGateway.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly logger: AppLogger,
  ) {
    this.logger.warn(NotificationsGateway.name);
  }

  async handleConnection(client: Socket) {
    const token = this.extractAccessToken(client);
    if (!token) {
      this.log.warn('Handshake without token -> disconnect');
      return client.disconnect(true);
    }

    const meta = { requestId: `ws_conn_${client.id}_${Date.now()}` };
    let payload: { userId: number } | null = null;
    try {
      payload = await this.authService.validateAccessToken(meta, token);
    } catch {
      this.log.warn('Invalid token -> disconnect');
      return client.disconnect(true);
    }
    if (!payload?.userId) {
      this.log.warn('Invalid token payload -> disconnect');
      return client.disconnect(true);
    }

    const user = await this.usersService.getUserById(meta, payload.userId);

    client.data.user = {
      id: user.sub,
      email: user.email,
      role: user.role,
      // specializationId: user.specializationId ?? null,
    };
    await client.join(this.userRoom(user.sub));

    this.log.log(`Client connected uid=${user.sub} socket=${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.log.log(`Client disconnected socket=${client.id}`);
  }

  private userRoom(userId: number) {
    return `user:${userId}`;
  }

  private extractAccessToken(client: Socket): string | null {
    const fromAuth = client.handshake?.auth?.token;
    if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth.trim();
    const hdr = client.handshake?.headers?.authorization;
    if (typeof hdr === 'string') {
      const m = /^Bearer\s+(.+)$/i.exec(hdr);
      if (m?.[1]) return m[1].trim();
    }
    return null;
  }

  // Публичный метод для сервисов
  notifyUserSpecializationChanged(
    userId: number,
    specializationId: number | null,
  ) {
    this.server.to(this.userRoom(userId)).emit('specialization-changed', {
      specializationId,
      ts: Date.now(),
    });
  }
}
