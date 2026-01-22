import type { Request } from 'express';
import {
  diskStorage,
  type FileFilterCallback,
  type StorageEngine,
} from 'multer';
import { mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

export const VIDEO_UPLOAD_DIR = join(process.cwd(), 'uploads', 'videos');
export type RequestWithValidation = Request & { fileValidationError?: string };

export interface UploadFileLike {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string;
  destination?: string;
  path?: string;
}

const ALLOWED_MIME = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/ogg',
]);

const ALLOWED_EXT = new Set(['.mp4', '.webm', '.mov', '.mkv', '.ogv']);

function safeBase(original: string): string {
  const ext = extname(original).toLowerCase();
  const base = basename(original, ext);
  return base
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function safeFilename(original: string): string {
  const ext = extname(original).toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}-${safeBase(original)}${ext}`;
}

function ensureUploadDirOrThrow(): void {
  try {
    mkdirSync(VIDEO_UPLOAD_DIR, { recursive: true });
  } catch {
    throw new Error('Failed to create upload dir');
  }
}

function duplicateExists(original: string): boolean {
  ensureUploadDirOrThrow();
  const ext = extname(original).toLowerCase();
  const suffix = `-${safeBase(original)}${ext}`;
  const names: readonly string[] = readdirSync(VIDEO_UPLOAD_DIR, {
    encoding: 'utf8',
  });
  for (let i = 0; i < names.length; i += 1) {
    if (names[i].endsWith(suffix)) return true;
  }
  return false;
}

export const videoDiskStorage: StorageEngine = diskStorage({
  destination: (req, _file, cb) => {
    try {
      ensureUploadDirOrThrow();
      cb(null, VIDEO_UPLOAD_DIR);
    } catch (err) {
      (req as RequestWithValidation).fileValidationError =
        'Upload directory is not available';
      cb(err as Error, VIDEO_UPLOAD_DIR);
    }
  },
  filename: (_req, file, cb) => {
    cb(null, safeFilename(file.originalname));
  },
});

export function videoOnlyFilter(
  req: Request,
  file: UploadFileLike,
  cb: FileFilterCallback,
): void {
  const ext = extname(file.originalname).toLowerCase();
  const isVideo = ALLOWED_MIME.has(file.mimetype) || ALLOWED_EXT.has(ext);

  if (!isVideo) {
    (req as RequestWithValidation).fileValidationError =
      'Only video files are allowed';
    cb(null, false);
    return;
  }

  let isDup = false;
  try {
    isDup = duplicateExists(file.originalname);
  } catch {
    (req as RequestWithValidation).fileValidationError =
      'Upload directory is not available';
    cb(null, false);
    return;
  }

  if (isDup) {
    (req as RequestWithValidation).fileValidationError =
      'A file with this name already exists';
    cb(null, false);
    return;
  }

  cb(null, true);
}
