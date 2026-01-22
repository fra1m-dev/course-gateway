import { Request, Response } from 'express';

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
  Query,
  Req,
  Res,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger';
import { basename } from 'node:path';
import { createReadStream, promises as fs } from 'node:fs';
import { stat } from 'node:fs/promises';

import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/secure/guards/roles.quard';
import { ReqId } from 'src/common/http/req-id.decorator';
import { AppLogger } from 'src/common/logger/logger.service';
import { User } from 'src/common/decorators/user.decorator';
import { Role, Roles } from 'src/common/decorators/roles-auth.decorator';
import { UserModel } from '../users/models/user-model';

import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import {
  RequestWithValidation,
  UploadFileLike,
  videoDiskStorage,
  videoOnlyFilter,
} from './upload/storage';

const MAX_VIDEO_SIZE_BYTES = 512 * 1024 * 1024;

type RangeResult = { start: number; end: number } | null | 'invalid';

function parseRangeHeader(
  range: string | undefined,
  size: number,
): RangeResult {
  if (size <= 0) return 'invalid';
  if (!range) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) return 'invalid';

  const startStr = match[1];
  const endStr = match[2];
  if (startStr === '' && endStr === '') return 'invalid';

  let start = 0;
  let end = size - 1;

  if (startStr === '') {
    const suffix = Number(endStr);
    if (!Number.isFinite(suffix) || suffix <= 0) return 'invalid';
    start = Math.max(size - suffix, 0);
  } else {
    start = Number(startStr);
    if (!Number.isFinite(start) || start < 0) return 'invalid';
  }

  if (endStr !== '') {
    end = Number(endStr);
    if (!Number.isFinite(end) || end < 0) return 'invalid';
  }

  if (end > size - 1) end = size - 1;

  if (start >= size || end < start) return 'invalid';

  return { start, end };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(VideosController.name);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('create')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: videoDiskStorage,
      fileFilter: videoOnlyFilter,
      limits: { fileSize: MAX_VIDEO_SIZE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  async createVideo(
    @ReqId() reqId: string,
    @User() user: UserModel,
    @Req() req: RequestWithValidation,
    @Body() dto: CreateVideoDto,
    @UploadedFile() file?: UploadFileLike,
  ) {
    const meta = { requestId: reqId };

    try {
      if (req.fileValidationError) {
        throw new BadRequestException(req.fileValidationError);
      }
      if (!file) {
        throw new BadRequestException('Video file is required');
      }

      const relPath = `uploads/videos/${file.filename}`;

      const payload = await this.videosService.createVideo(meta, dto, user, {
        filePath: relPath,
        mimeType: file.mimetype,
        size: file.size,
        originalName: file.originalname,
      });

      return payload;
    } catch (e) {
      if (file?.path) {
        await fs.unlink(file.path).catch(() => undefined);
      }
      this.logger.error({ rid: reqId, err: e }, 'videos.create failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid request');
    }
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get('all')
  async getAll(
    @ReqId() reqId: string,
    @Query('courseId') courseId?: string,
    @Query('lessonId') lessonId?: string,
    @Query('uploaderId') uploaderId?: string,
  ) {
    const meta = { requestId: reqId };

    const filter = {
      courseId: courseId ? Number(courseId) : undefined,
      lessonId: lessonId ? Number(lessonId) : undefined,
      uploaderId: uploaderId ? Number(uploaderId) : undefined,
    };

    return this.videosService.getAll(meta, filter);
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get(':id')
  async getById(@ReqId() reqId: string, @Param('id', ParseIntPipe) id: number) {
    const meta = { requestId: reqId };
    return this.videosService.getById(meta, id);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Patch(':id')
  async update(
    @ReqId() reqId: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVideoDto,
  ) {
    const meta = { requestId: reqId };
    return this.videosService.update(meta, id, dto);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Delete(':id')
  async delete(@ReqId() reqId: string, @Param('id', ParseIntPipe) id: number) {
    const meta = { requestId: reqId };
    return this.videosService.delete(meta, id);
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get(':id/stream')
  async streamVideo(
    @ReqId() reqId: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const meta = { requestId: reqId };

    try {
      const video = await this.videosService.getById(meta, id);
      const absPath = this.videosService.resolveFilePath(video.filePath);
      const st = await stat(absPath);
      const size = st.size;
      const filename = video.originalName || basename(absPath);
      const contentType = video.mimeType || 'application/octet-stream';

      const range = parseRangeHeader(req.headers.range, size);
      if (range === 'invalid') {
        res.status(416).set('Content-Range', `bytes */${size}`).end();
        return;
      }

      res.set({
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        'Content-Disposition': `inline; filename="${encodeURIComponent(
          filename,
        )}"`,
      });

      if (range) {
        const { start, end } = range;
        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
        });
        const stream = createReadStream(absPath, { start, end });
        stream.on('error', (err) => {
          if (!res.headersSent) res.status(500).end('stream error');
          else res.destroy(err);
        });
        stream.pipe(res);
        return;
      }

      res.status(200).set({ 'Content-Length': String(size) });
      const stream = createReadStream(absPath);
      stream.on('error', (err) => {
        if (!res.headersSent) res.status(500).end('stream error');
        else res.destroy(err);
      });
      stream.pipe(res);
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'videos.stream failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid request');
    }
  }

  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get(':id/download')
  async downloadVideo(
    @ReqId() reqId: string,
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const meta = { requestId: reqId };

    try {
      const video = await this.videosService.getById(meta, id);
      const absPath = this.videosService.resolveFilePath(video.filePath);
      const st = await stat(absPath);
      const size = st.size;
      const filename = video.originalName || basename(absPath);
      const contentType = video.mimeType || 'application/octet-stream';

      const range = parseRangeHeader(req.headers.range, size);
      if (range === 'invalid') {
        res.status(416).set('Content-Range', `bytes */${size}`).end();
        return;
      }

      res.set({
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(
          filename,
        )}"`,
      });

      if (range) {
        const { start, end } = range;
        res.status(206).set({
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Content-Length': String(end - start + 1),
        });
        const stream = createReadStream(absPath, { start, end });
        stream.on('error', (err) => {
          if (!res.headersSent) res.status(500).end('stream error');
          else res.destroy(err);
        });
        stream.pipe(res);
        return;
      }

      res.status(200).set({ 'Content-Length': String(size) });
      const stream = createReadStream(absPath);
      stream.on('error', (err) => {
        if (!res.headersSent) res.status(500).end('stream error');
        else res.destroy(err);
      });
      stream.pipe(res);
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'videos.download failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid request');
    }
  }
}
