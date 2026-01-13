import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';
import { UsersModule } from '../users/users.module';
import { LessonsModule } from '../lessons/lessons.module';

@Module({
  imports: [RmqModule.forAnalytics(), UsersModule, LessonsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
