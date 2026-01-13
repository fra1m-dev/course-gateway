import { Response, Request } from 'express';

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CoursesService } from './courses.service';
import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/secure/guards/roles.quard';
import { ReqId } from 'src/common/http/req-id.decorator';
import { AppLogger } from 'src/common/logger/logger.service';
import { UserModel } from '../users/models/user-model';
import { User } from 'src/common/decorators/user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { CreateCourseDto } from './dto/create-course.dto';
import {
  deferredCourseStorage,
  pdfOnlyFilter,
  RequestWithValidation,
  UploadFileLike,
  persistBufferedPdf,
} from './upload/storage';
import { Role, Roles } from 'src/common/decorators/roles-auth.decorator';
import { stat } from 'fs/promises';
import { basename } from 'path';
import { createReadStream } from 'node:fs';
import { UpdateCourseDto } from './dto/update-course.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(CoursesController.name);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('/create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: deferredCourseStorage,
      fileFilter: pdfOnlyFilter,
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('/create')
  async createCourse(
    @ReqId() reqId: string,
    @User() user: UserModel,
    @Req() req: RequestWithValidation,
    @Body() dto: CreateCourseDto,
    @UploadedFile() file?: UploadFileLike,
  ) {
    const meta = { requestId: reqId };

    try {
      if (req.fileValidationError) {
        throw new BadRequestException(req.fileValidationError);
      }
      if (!file) {
        throw new BadRequestException('Файл обязателен и должен быть PDF');
      }

      const persisted = await persistBufferedPdf(file);
      const filePath = persisted.relPath;
      const payload = await this.coursesService.createCours(
        meta,
        dto,
        user,
        filePath,
      );

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'courses.create failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get('getAllCourses')
  async getAllCourses(@User() user: UserModel, @ReqId() reqId: string) {
    const meta = { requestId: reqId };

    // const lockKey = `get:all:reqId:${reqId}`;
    // const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    // if (!lockOk) {
    //   throw new ConflictException('Registration in progress for this email');
    // }

    this.logger.info(
      { rid: reqId, userId: user.sub },
      'courses.getAllCourses started',
    );
    try {
      const payload = await this.coursesService.getAllCourses(meta, user);

      this.logger.debug({ payload }, 'courses.getAllCourses done');

      this.logger.info({ rid: reqId }, 'courses.getAllCourses done');

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'courses.getAllCourses failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  //TODO: возможно потом вынести в отдельный микросервис файловый
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get(':id/file')
  async streamCoursePdf(
    @Param('id', ParseIntPipe) id: number,
    @ReqId() reqId: string,
    @Res() res: Response,
  ) {
    const meta = { requestId: reqId };

    try {
      this.logger.info(`Streaming course file for course ID: ${id}`);

      const absPath = await this.coursesService.getCourseFilePathById(meta, id);
      const st = await stat(absPath);
      const filename = basename(absPath);

      // заголовки общие
      res.set({
        'Content-Type': 'application/pdf',
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      });

      // без Range — отдаём целиком
      res.status(200).set('Content-Length', String(st.size));

      const fullStream = createReadStream(absPath);
      fullStream.on('error', (err) => {
        if (!res.headersSent) res.status(500).end('stream error');
        else res.destroy(err);
      });
      fullStream.pipe(res);
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'courses.fileStream failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Patch('/update')
  @ApiConsumes('/update')
  async updateCourse(
    @User() user: UserModel,
    @Body() dto: UpdateCourseDto,
    @ReqId() reqId: string,
  ) {
    const meta = { requestId: reqId };

    try {
      const course = await this.coursesService.updateCourse(meta, dto, user);

      //TODO: расскомитировать когда добавим спецмиализации
      // // разрешим администратору менять специализацию курса
      // if (dto.specializationId !== undefined) {
      //   if (!isAdmin) {
      //     throw new ForbiddenException(
      //       'Недостаточно прав для смены специализации курса',
      //     );
      //   }
      //   const specId = dto.specializationId;
      //   if (!Number.isFinite(specId) || specId <= 0) {
      //     throw new BadRequestException('Некорректный айди специальности');
      //   }
      //   const spec =
      //     (await this.specializationService.findSpecById(specId)) ?? null;
      //   if (!spec) throw new BadRequestException('Специализация не найдена');
      //   course.specialization = spec;
      // }
      return course;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'courses.update failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Delete('/delete')
  @ApiConsumes('/delete')
  async deleteCourse(
    @User() user: UserModel,
    @Body() dto: UpdateCourseDto,
    @ReqId() reqId: string,
  ) {
    const meta = { requestId: reqId };

    try {
      const payload = await this.coursesService.deleteCourse(meta, dto, user);
      //TODO добавить удаление всех причастных уроков и квизов
      //TODO: при удалениии все на бекенде работает, но фронт сразу не обновляется, нужно исправить - баг фронта
      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'courses.delete failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
