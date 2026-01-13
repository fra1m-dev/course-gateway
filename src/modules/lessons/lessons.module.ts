import { Module } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { LessonsController } from './lessons.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [RmqModule.forLessons(), CoursesModule],
  controllers: [LessonsController],
  providers: [LessonsService],
  exports: [LessonsService],
})
export class LessonsModule {}
