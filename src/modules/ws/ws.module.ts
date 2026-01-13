// import { WsController } from './ws.controller';
// import { WsService } from './ws.service';
// import { RmqModule } from 'src/common/rmq/rmq.module';
// import { WsRpcController } from './ws.rpc.controller';
import { forwardRef, Global, Module } from '@nestjs/common';
import { NotificationsGateway } from './ws.gateway';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [forwardRef(() => AuthModule), forwardRef(() => UsersModule)],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class RealtimeModule {}
