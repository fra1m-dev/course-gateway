// import { Controller } from '@nestjs/common';
// import { MessagePattern, Payload } from '@nestjs/microservices';
// import { AppLogger } from 'src/common/logger/logger.service';
// import { CacheHelper } from 'src/common/redis/redis.service';
// import { WS_PATTERNS } from 'src/contracts/ws/ws.patterns';

// @Controller()
// export class WsRpcController {
//   constructor(
//     private readonly cache: CacheHelper,
//     private readonly logger: AppLogger,
//   ) {
//     this.logger.setContext(WsRpcController.name);
//   }

//   @MessagePattern(WS_PATTERNS.WS_TICKET_VERIFY)
//   async verify(@Payload() data: { ticketId: string; rid?: string }) {
//     const rid = data?.rid;
//     const key = `ws:ticket:${data.ticketId}`;
//     const claims = await this.cache.getJson<any>(key);
//     if (claims) {
//       await this.cache.del(key); // одноразово
//       this.logger.info({ rid, userId: claims.userId }, 'ws.ticket.verify.ok');
//       return { ok: true, claims };
//     }
//     this.logger.warn({ rid }, 'ws.ticket.verify.fail');
//     return { ok: false, reason: 'invalid_or_expired' };
//   }
// }
