import {
  Body,
  Controller,
  HttpException,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { UserModel } from '../users/models/user-model';
import { User } from 'src/common/decorators/user.decorator';
import { SubmitQuizDto } from './dto/submit-analytics.dto';
import { ReqId } from 'src/common/http/req-id.decorator';
import { AppLogger } from 'src/common/logger/logger.service';
import { UsersService } from '../users/users.service';
import { LessonsService } from '../lessons/lessons.service';

@Controller()
export class AnalyticsController {
  constructor(
    private readonly logger: AppLogger,
    private readonly analyticsService: AnalyticsService,
    private readonly usersService: UsersService,
    private readonly lessonsService: LessonsService,
  ) {
    this.logger.setContext(AnalyticsController.name);
  }

  //TODO проверить работоспособность и добавить микросервис ANALYTICS в докер композе
  @Post('quiz/submit')
  async submitQuiz(
    @ReqId() reqId: string,
    @Body() dto: SubmitQuizDto,
    @User() user: UserModel,
  ) {
    const meta = { requestId: reqId };

    try {
      const agg = await this.analyticsService.getAggByUserId(meta, user.sub);

      const quizzesPassed = Number(agg?.cntPassed ?? 0);
      const averageScore = Number(agg?.avgScore ?? 0);
      const lessonsCompleted = Number(agg?.lessonsCompleted ?? 0);

      const { lessonsTotal, quizzesTotal } =
        await this.lessonsService.getTotalsQuizLessons(meta, dto.courseId);

      const stats = await this.usersService.applyQuizStats(meta, user.sub, {
        quizzesTotal,
        quizzesPassed,
        averageScore,
        lessonsTotal,
        lessonsCompleted,
        lastActiveAt: new Date(),
      });

      const payload = await this.analyticsService.submitQuizAttempt(
        meta,
        dto,
        user.sub,
        stats,
      );

      this.logger.debug(payload, 'analytics.submit successful');
      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'analytics.submit failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
