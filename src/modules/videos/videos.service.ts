import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';
import { VIDEOS_CLIENT } from 'src/common/rmq/rmq.module';
import { rpc } from 'src/common/rpc/rpc.util';
import { PATTERNS } from 'src/contracts/patterns';
import { UserModel } from '../users/models/user-model';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideoModel } from './models/video-model';

export type VideoCreateFile = {
  filePath: string;
  mimeType: string;
  size: number;
  originalName?: string;
};

export type VideoFilter = {
  courseId?: number;
  lessonId?: number;
  uploaderId?: number;
};

@Injectable()
export class VideosService {
  constructor(@Inject(VIDEOS_CLIENT) private readonly videos: ClientProxy) {}

  private get uploadBase() {
    return resolve(process.env.VIDEO_UPLOAD_DIR ?? '/app/uploads/videos');
  }

  private normalizeAndGuard(pathFromDb: string): string {
    const abs = resolve(pathFromDb);
    const base = this.uploadBase;
    if (!abs.startsWith(base)) {
      throw new Error(`Refusing to access outside upload dir: ${abs}`);
    }
    return abs;
  }

  resolveFilePath(pathFromDb: string): string {
    return this.normalizeAndGuard(pathFromDb);
  }

  async createVideo(
    meta: { requestId: string },
    dto: CreateVideoDto,
    user: UserModel,
    file: VideoCreateFile,
  ): Promise<VideoModel> {
    return rpc<VideoModel>(this.videos, PATTERNS.VIDEOS_CREATE, {
      meta,
      dto,
      user,
      file,
    });
  }

  async getAll(
    meta: { requestId: string },
    filter: VideoFilter = {},
  ): Promise<VideoModel[]> {
    return rpc<VideoModel[]>(this.videos, PATTERNS.VIDEOS_GET_ALL, {
      meta,
      filter,
    });
  }

  async getById(
    meta: { requestId: string },
    id: number,
  ): Promise<VideoModel> {
    return rpc<VideoModel>(this.videos, PATTERNS.VIDEOS_GET_BY_ID, {
      meta,
      id,
    });
  }

  async update(
    meta: { requestId: string },
    id: number,
    dto: UpdateVideoDto,
  ): Promise<VideoModel> {
    return rpc<VideoModel>(this.videos, PATTERNS.VIDEOS_UPDATE, {
      meta,
      id,
      dto,
    });
  }

  async delete(
    meta: { requestId: string },
    id: number,
  ): Promise<{ id: number }> {
    const deleted = await rpc<{ id: number; filePath: string }>(
      this.videos,
      PATTERNS.VIDEOS_DELETE,
      {
        meta,
        id,
      },
    );

    const absPath = deleted.filePath
      ? this.normalizeAndGuard(deleted.filePath)
      : null;

    if (!absPath) {
      throw new HttpException(
        'Invalid video file path',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      await fs.unlink(absPath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code === 'ENOENT') {
        throw new HttpException(
          `File already missing: ${absPath}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        `Failed to delete file: ${String(err)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return { id: deleted.id };
  }
}
