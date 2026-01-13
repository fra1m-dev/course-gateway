import { Response } from 'express';

import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { AppLogger } from 'src/common/logger/logger.service';
import { Role, Roles } from 'src/common/decorators/roles-auth.decorator';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { ReqId } from 'src/common/http/req-id.decorator';
import { CoursesService } from '../courses/courses.service';
import { randomInt } from 'crypto';

@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly coursesService: CoursesService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(LessonsController.name);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('/create')
  async saveLesson(@ReqId() reqId: string, @Body() body: CreateLessonDto) {
    const meta = { requestId: reqId };

    try {
      const course = await this.coursesService.getCourseById(body.courseId);
      // const quiz = (await this.quizService.findQuizByID(body.quizId ?? 0)) ?? 0;

      // TODO временно, пока нет микросервиса Quiz
      body.quizId = body.quizId ?? 0;

      // TODO после добавления микросервиса Quiz раскомментировать проверку '|| !quiz'
      if (!course) {
        throw new HttpException('Курс не найден', 404);
      }

      const payload = await this.lessonsService.saveLesson(meta, body, course);

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'lessons.create failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get(':id/content')
  async streamLessonContent(
    @ReqId() reqId: string,
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const meta = { requestId: reqId };

    try {
      const lesson = await this.lessonsService.getLessonById(meta, id);
      console.log('LESSON', lesson);
      if (!lesson) {
        throw new HttpException('Урок не найден', 404);
      }
      const buf = await this.lessonsService.streamLesson(lesson);
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': String(buf.length),
        'Content-Disposition': `inline; filename="${encodeURIComponent(
          `lesson-${id + randomInt(100)}`,
        )}"`,
        'Cache-Control': 'no-store',
      });
      res.end(buf);
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'lessons.create failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get('all')
  async getAllLessons(@ReqId() reqId: string) {
    const meta = { requestId: reqId };
    try {
      const items = await this.lessonsService.getAllLessonsLite(meta);

      const payload = items.map((l) =>
        l.quizId
          ? {
              id: l.id,
              title: l.title,
              pages: l.pages,
              quizId: l.quizId,
              courseId: l.courseId,
            }
          : {
              id: l.id,
              title: l.title,
              pages: l.pages,
              quizId: null,
              courseId: l.courseId,
            },
      );

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'lessons.create failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
