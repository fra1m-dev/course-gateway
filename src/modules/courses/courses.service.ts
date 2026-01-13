import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { COURSES_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { PATTERNS } from 'src/contracts/patterns';
import { CourseModel } from './models/course-model';
import { UserModel } from '../users/models/user-model';
import { CreateCourseDto } from './dto/create-course.dto';
import { DeleteCourseDto } from './dto/delete-course.dto';
import { resolve } from 'path';
import { promises as fs } from 'node:fs';
import { UpdateCourseDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(@Inject(COURSES_CLIENT) private readonly courses: ClientProxy) {}

  private get uploadBase() {
    return resolve(process.env.UPLOAD_DIR ?? '/app/uploads/courses');
  }

  private normalizeAndGuard(absFromDb: string): string {
    const abs = resolve(absFromDb);
    const base = this.uploadBase;
    if (!abs.startsWith(base)) {
      // не удаляем ничего вне каталога загрузок
      throw new Error(
        `Refusing to delete outside upload dir: ${abs} (base ${base})`,
      );
    }
    return abs;
  }

  //TODO: препроверить
  async getCourseFilePathById(
    meta: { requestId: string },
    id: number,
  ): Promise<string> {
    const course = await rpc<CourseModel>(
      this.courses,
      PATTERNS.COURSES_GET_BY_ID,
      {
        meta,
        id,
      },
    );

    // if (!course || !course.filePath) {
    //   throw new HttpException('Курс не существует', HttpStatus.BAD_REQUEST);
    // }

    return process.cwd() + `/${course.filePath}`;
  }

  //TODO: обавить specilizationId как параметр (курсы выдаем по специализации и по роли - роль в контроллере)
  async getAllCourses(
    meta: { requestId: string },
    user: UserModel,
  ): Promise<CourseModel[]> {
    const courses = await rpc<CourseModel[]>(
      this.courses,
      PATTERNS.COURSES_ALL,
      {
        meta,
        user,
      },
    );
    return courses;
  }

  async createCours(
    meta: { requestId: string },
    dto: CreateCourseDto,
    user: UserModel,
    filePath: string,
  ): Promise<CourseModel> {
    const courses = await rpc<CourseModel>(
      this.courses,
      PATTERNS.COURSES_CREATE,
      {
        meta,
        dto,
        user,
        filePath,
      },
    );

    return courses;
  }

  async deleteCourse(
    meta: { requestId: string },
    dto: DeleteCourseDto,
    user: UserModel,
  ): Promise<{ id: number }> {
    const course = await rpc<{ courseID: number; filePath: string }>(
      this.courses,
      PATTERNS.COURSES_DELETE,
      {
        meta,
        dto,
        user,
      },
    );

    console.log('DELETE COURSE', course);

    const absPath = course.filePath
      ? this.normalizeAndGuard(course.filePath)
      : null;
    if (absPath === null) {
      throw new HttpException(
        'Внутренняя ошибка сервера',
        HttpStatus.BAD_REQUEST,
      );
    }
    // 2) пробуем удалить файл; ошибка удаления не роняет запрос
    if (absPath) {
      try {
        await fs.unlink(absPath);
        // return `Удалён файл курса: ${absPath}`;
      } catch (err) {
        const code = (err as NodeJS.ErrnoException)?.code;
        if (code === 'ENOENT') {
          throw new HttpException(
            `Файл уже отсутствует: ${absPath}`,
            HttpStatus.BAD_REQUEST,
          );
        } else {
          throw new HttpException(
            `Не удалось удалить файл "${absPath}": ${String(err)}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }

    return { id: course.courseID };
  }

  async updateCourse(
    meta: { requestId: string },
    dto: UpdateCourseDto,
    user: UserModel,
  ): Promise<CourseModel> {
    const course = await rpc<CourseModel>(
      this.courses,
      PATTERNS.COURSES_UPDATE,
      {
        meta,
        dto,
        user,
      },
    );

    return course;
  }

  async getCourseById(id: number): Promise<CourseModel> {
    const course = await rpc<CourseModel>(
      this.courses,
      PATTERNS.COURSES_GET_BY_ID,
      {
        id,
      },
    );

    return course;
  }
}
