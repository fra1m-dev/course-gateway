export type VideoModel = {
  id: number;
  title: string;
  description?: string | null;
  uploaderId: number;
  courseId?: number | null;
  lessonId?: number | null;
  filePath: string;
  originalName?: string | null;
  mimeType: string;
  size: number;
  durationSec?: number | null;
  createdAt: string;
  updatedAt: string;
};
