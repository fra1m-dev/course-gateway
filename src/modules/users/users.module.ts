import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module';
import { RmqModule } from 'src/common/rmq/rmq.module';

@Module({
  imports: [AuthModule, RmqModule.forUsers()],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
