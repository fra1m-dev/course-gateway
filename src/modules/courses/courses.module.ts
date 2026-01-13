import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service';
import { CoursesController } from './courses.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';

@Module({
  imports: [RmqModule.forCourses()],
  controllers: [CoursesController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
