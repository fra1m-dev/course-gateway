import type { Request } from 'express';
import {
  memoryStorage,
  type FileFilterCallback,
  type StorageEngine,
} from 'multer';
import { mkdirSync, readdirSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

export const UPLOAD_DIR = join(process.cwd(), 'uploads', 'courses');
export type RequestWithValidation = Request & { fileValidationError?: string };

export interface UploadFileLike {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  filename: string; // при memoryStorage Multer его тоже задаёт
  destination?: string; // при memoryStorage обычно нет
  path?: string; // при memoryStorage нет
  buffer?: Buffer; // при memoryStorage есть
}

/** Нормализуем базовое имя (без расширения) — буквы/цифры/_/- */
function safeBase(original: string): string {
  const ext = extname(original).toLowerCase();
  const base = basename(original, ext);
  return base
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Генерим итоговое имя: YYYY-MM-DD-<rand>-<safeBase><ext> */
function safeFilename(original: string): string {
  const ext = extname(original).toLowerCase();
  const stamp = new Date().toISOString().slice(0, 10);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${stamp}-${rand}-${safeBase(original)}${ext}`;
}

function ensureUploadDirOrThrow(): void {
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch {
    throw new Error('Failed to create upload dir');
  }
}

/** Дубликат по «логическому» имени: *-<safeBase><ext> уже существует? */
function duplicateExists(original: string): boolean {
  ensureUploadDirOrThrow();
  const ext = extname(original).toLowerCase();
  const suffix = `-${safeBase(original)}${ext}`;
  const names: readonly string[] = readdirSync(UPLOAD_DIR, {
    encoding: 'utf8',
  });
  for (let i = 0; i < names.length; i += 1) {
    if (names[i].endsWith(suffix)) return true;
  }
  return false;
}

/** НОВОЕ: «отложенный» сторедж — кладём файл в память, не на диск */
export const deferredCourseStorage: StorageEngine = memoryStorage();

/** Хелпер: после валидации — сохранить буфер на диск, вернуть пути/имя */
export async function persistBufferedPdf(file: UploadFileLike): Promise<{
  storedName: string;
  absPath: string;
  relPath: string;
}> {
  // минимальная защита (хоть это уже и делал fileFilter)
  const isPdf =
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf');
  if (!isPdf) {
    throw new Error('Only PDF files are allowed');
  }
  if (!(file.buffer instanceof Buffer)) {
    throw new Error('No in-memory buffer provided by storage');
  }

  ensureUploadDirOrThrow();
  const storedName = safeFilename(file.originalname);
  const absPath = join(UPLOAD_DIR, storedName);
  await writeFile(absPath, file.buffer);
  return {
    storedName,
    absPath,
    relPath: join('uploads', 'courses', storedName),
  };
}

/** Разрешаем только PDF и блокируем дубли ДО записи на диск */
export function pdfOnlyFilter(
  req: Request,
  file: UploadFileLike,
  cb: FileFilterCallback,
): void {
  const isPdf =
    file.mimetype === 'application/pdf' ||
    file.originalname.toLowerCase().endsWith('.pdf');

  if (!isPdf) {
    (req as RequestWithValidation).fileValidationError = 'Разрешены только PDF';
    cb(null, false);
    return;
  }

  let isDup = false;
  try {
    isDup = duplicateExists(file.originalname);
  } catch {
    (req as RequestWithValidation).fileValidationError =
      'Каталог загрузок недоступен';
    cb(null, false);
    return;
  }

  if (isDup) {
    (req as RequestWithValidation).fileValidationError =
      'Файл с таким именем уже загружён';
    cb(null, false);
    return;
  }

  cb(null, true);
}
