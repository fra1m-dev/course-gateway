import { Inject, Injectable } from '@nestjs/common';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { QUIZZES_CLIENT } from 'src/common/rmq/rmq.module';
import { ClientProxy } from '@nestjs/microservices';
import { rpc } from 'src/common/rpc/rpc.util';
import { PATTERNS } from 'src/contracts/patterns';
import { QuizzesModel } from './models/quizzes-model';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { DeleteQuizDto } from './dto/delete-quiz.dto';

@Injectable()
export class QuizzesService {
  constructor(@Inject(QUIZZES_CLIENT) private readonly quizzes: ClientProxy) {}

  async saveQuiz(
    meta: { requestId: string },
    dto: CreateQuizDto,
    userId: number,
  ): Promise<QuizzesModel> {
    const quiz = await rpc<QuizzesModel>(
      this.quizzes,
      PATTERNS.QUIZZES_CREATE,
      {
        meta,
        dto,
        userId,
      },
    );

    return quiz;
  }

  async getByQuizUserId(
    meta: { requestId: string },
    userId: number,
  ): Promise<QuizzesModel[]> {
    const quizzes = await rpc<QuizzesModel[]>(
      this.quizzes,
      PATTERNS.QUIZZES_GET_BY_USER_ID,
      {
        meta,
        userId,
      },
    );

    return quizzes;
  }

  async updateQuize(
    meta: { requestId: string },
    dto: UpdateQuizDto,
    userId: number,
  ) {
    const quizzes = await rpc<QuizzesModel[]>(
      this.quizzes,
      PATTERNS.QUIZZES_UPDATE_BY_USER_ID,
      {
        meta,
        dto,
        userId,
      },
    );

    return quizzes;
  }

  async deleteQuiz(
    meta: { requestId: string },
    dto: DeleteQuizDto,
    userId: number,
  ): Promise<string> {
    const quizzes = await rpc<string>(this.quizzes, PATTERNS.QUIZZES_DELETE, {
      meta,
      dto,
      userId,
    });

    return quizzes;
  }
}
