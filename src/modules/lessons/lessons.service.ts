import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LESSONS_CLIENT } from 'src/common/rmq/rmq.module';
import { LessonsModel } from './models/lessons-model';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { PATTERNS } from 'src/contracts/patterns';
import { rpc } from 'src/common/rpc/rpc.util';
import { CourseModel } from '../courses/models/course-model';

import { PDFDocument } from 'pdf-lib';
import { readFile } from 'fs/promises';

@Injectable()
export class LessonsService {
  constructor(@Inject(LESSONS_CLIENT) private readonly lessons: ClientProxy) {}

  async saveLesson(
    meta: { requestId: string },
    dto: CreateLessonDto,
    course: CourseModel,
  ): Promise<LessonsModel> {
    const lesson = await rpc<LessonsModel>(
      this.lessons,
      PATTERNS.LESSONS_CREATE,
      {
        meta,
        dto,
        course,
      },
    );

    return lesson;
  }

  async streamLesson(lesson: LessonsModel): Promise<Buffer> {
    const filePath = lesson.filePath;

    const bytes = await readFile(filePath);
    const src = await PDFDocument.load(bytes);

    const pageCount = src.getPageCount();
    if (lesson.pages.end > pageCount) {
      throw new BadRequestException(`from > total pages (${pageCount})`);
    }

    const start = Math.max(1, Math.min(lesson.pages.startWith, pageCount));
    const end = Math.max(start, Math.min(lesson.pages.end, pageCount));

    const dst = await PDFDocument.create();
    const indices: number[] = [];
    for (let i = start - 1; i < end; i += 1) indices.push(i);

    const copied = await dst.copyPages(src, indices);
    for (const p of copied) {
      dst.addPage(p);
    }

    const out = await dst.save(); // Uint8Array

    return Buffer.from(out);
  }

  async getLessonById(
    meta: { requestId: string },
    lessonId: string,
  ): Promise<LessonsModel> {
    const lesson = await rpc<LessonsModel>(
      this.lessons,
      PATTERNS.LESSONS_GET_BY_ID,
      {
        meta,
        lessonId,
      },
    );
    return lesson;
  }

  async getAllLessonsLite(meta: {
    requestId: string;
  }): Promise<LessonsModel[]> {
    const lessons = await rpc<LessonsModel[]>(
      this.lessons,
      PATTERNS.LESSONS_ALL_LITE,
      { meta },
    );
    return lessons;
  }

  async getTotalsQuizLessons(
    meta: { requestId: string },
    courseId: number,
  ): Promise<{
    lessonsTotal: number;
    quizzesTotal: number;
  }> {
    const { lessonsTotal, quizzesTotal } = await rpc<{
      lessonsTotal: number;
      quizzesTotal: number;
    }>(this.lessons, PATTERNS.LESSONS_GET_TOTALS, { meta, courseId });

    return { lessonsTotal, quizzesTotal };
  }
}
