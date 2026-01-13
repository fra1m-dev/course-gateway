export type CourseModel = {
  id: number;

  title: string;

  description: string;

  lessonsId: number[];

  quizesId?: number[];

  teacherId: number;

  specializationId?: number | null;

  studentsId?: number[];

  filePath: string;
};
