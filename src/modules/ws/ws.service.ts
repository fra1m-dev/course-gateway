// // src/modules/ws/ws.service.ts
// import { Inject, Injectable } from '@nestjs/common';
// import { randomUUID } from 'crypto';
// import { ClientProxy } from '@nestjs/microservices';

// import { CacheHelper } from 'src/common/redis/redis.service';
// import { WS_CLIENT } from 'src/common/rmq/rmq.module';
// import { WsClaims, WsEvent, WS_PATTERNS } from 'src/contracts/ws/ws.patterns';
// import { rpc } from 'src/common/rpc/rpc.util';

// @Injectable()
// export class WsService {
//   constructor(@Inject(WS_CLIENT) private readonly ws: ClientProxy) {}

//   /** отправка события в WS-микросервис (fire-and-forget) */
//   async emitBroadcast(event: WsEvent) {
//     // Вся мета/логирование — в контроллере
//     const exists = await rpc(this.ws, WS_PATTERNS.WS_BROADCAST, { event });

//     return exists;
//   }
// }
