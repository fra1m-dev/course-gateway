export class AnalyticModel {
  attempt: {
    quizId: number;
    score: number;
    passed: boolean;
    correctCount: number;
    questionsTotal: number;
    updatedAt: Date;
  };

  stats: {
    quizzesTotal: number;
    quizzesPassed: number;
    averageScore: number;
    coursesEnrolled: number;
    coursesAuthored: number;
    lessonsTotal: number;
    lessonsCompleted: number;
    streakDays: number;
    lastActiveAt: string | null;
  };
}
