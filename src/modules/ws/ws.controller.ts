// import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
// import { ApiOperation } from '@nestjs/swagger';
// import { Request } from 'express';
// import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
// import { RolesGuard } from 'src/common/secure/guards/roles.quard';
// import { Roles } from 'src/common/decorators/roles-auth.decorator';
// import { ReqId } from 'src/common/http/req-id.decorator';
// import { WsService } from './ws.service';
// import { CacheHelper } from 'src/common/redis/redis.service';
// import { randomUUID } from 'crypto';
// import { WsClaims, WsEvent, WS_PATTERNS } from 'src/contracts/ws/ws.patterns';
// import { AppLogger } from 'src/common/logger/logger.service';

// @Controller('ws')
// export class WsController {
//   constructor(
//     private readonly ws: WsService,
//     private readonly cache: CacheHelper,
//     private readonly logger: AppLogger,
//   ) {
//     this.logger.setContext(WsController.name);
//   }

//   /** клиент → gateway: выдать одноразовый тикет для WS */
//   @ApiOperation({ summary: 'Выдать одноразовый WS-токен', operationId: 'ws1' })
//   @UseGuards(JwtAuthGuard)
//   @Post('/ticket')
//   async issueTicket(@Req() req: Request, @ReqId() rid: string) {
//     const user: any = (req as any).user;
//     const claims: WsClaims = {
//       userId: user.id,
//       role: user.role,
//       orgId: user.orgId ?? null,
//       specId: user.specializationId ?? null,
//       groupIds: user.groupIds ?? [],
//     };

//     const ticketId = randomUUID();
//     const ttlSec = 30;
//     const key = `ws:ticket:${ticketId}`;
//     await this.cache.setJson(key, claims, ttlSec);

//     this.logger.info({ rid, userId: user.id, ttlSec }, 'ws.ticket.issued');
//     return { ticketId, expiresInSec: ttlSec };
//   }

//   /** опционально: админский ручной broadcast для тестов */
//   @ApiOperation({ summary: 'WS broadcast (admin only)', operationId: 'ws2' })
//   @UseGuards(JwtAuthGuard, RolesGuard)
//   @Roles(Role.ADMIN)
//   @Post('/broadcast')
//   async broadcast(@Body() event: WsEvent, @ReqId() rid: string) {
//     const enriched: WsEvent = {
//       ...event,
//       meta: {
//         ...(event.meta ?? {}),
//         requestId: rid,
//         ts: Date.now(),
//         producer: 'gateway',
//       },
//     };
//     const broadcast = await this.ws.emitBroadcast(enriched);
//     if (!broadcast) {
//       this.logger.warn({ rid, event }, 'ws.broadcast.failed');
//       return { ok: false, reason: 'no_clients' };
//     }

//     return { ok: true, pattern: WS_PATTERNS.WS_BROADCAST };
//   }
// }
