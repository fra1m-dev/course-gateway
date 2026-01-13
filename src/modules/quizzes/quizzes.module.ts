import { Module } from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { QuizzesController } from './quizzes.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';

@Module({
  imports: [RmqModule.forQuizzes()],
  controllers: [QuizzesController],
  providers: [QuizzesService],
})
export class QuizzesModule {}
