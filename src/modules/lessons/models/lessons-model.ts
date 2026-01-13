export class LessonPageModel {
  startWith: number;

  end: number;
}

export class LessonsModel {
  id: number;

  title: string;

  filePath: string;

  pages: LessonPageModel;

  quizId: number;

  courseId: number;
}
