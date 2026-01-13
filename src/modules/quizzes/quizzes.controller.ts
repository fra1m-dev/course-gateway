import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { QuizzesService } from './quizzes.service';
import { UserModel } from '../users/models/user-model';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { Role, Roles } from 'src/common/decorators/roles-auth.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { AppLogger } from 'src/common/logger/logger.service';
import { ReqId } from 'src/common/http/req-id.decorator';
import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/secure/guards/roles.quard';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { DeleteQuizDto } from './dto/delete-quiz.dto';

//TODO: там где передаем пользователя, лучше использовать что то типо валидации, что такой пользователь существует
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('quiz')
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(QuizzesController.name);
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Post('/create')
  async createQuiz(
    @ReqId() reqId: string,
    @User() user: UserModel,
    @Body() dto: CreateQuizDto,
  ) {
    const meta = { requestId: reqId };

    try {
      const payload = await this.quizzesService.saveQuiz(meta, dto, user.sub);

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'quiz.create failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  //TODO: добавить фильтрацию по специализации в получении квиза
  @Roles(Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get('/all')
  async getQuiz(@ReqId() reqId: string, @User() user: UserModel) {
    const meta = { requestId: reqId };

    try {
      const payload = await this.quizzesService.getByQuizUserId(meta, user.sub);

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'quiz.getAll failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Patch('/update')
  async updateQuiz(
    @ReqId() reqId: string,
    @Body() dto: UpdateQuizDto,
    @User() user: UserModel,
  ) {
    const meta = { requestId: reqId };

    try {
      const payload = await this.quizzesService.updateQuize(
        meta,
        dto,
        user.sub,
      );

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'quiz.update failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.TEACHER, Role.ADMIN)
  @Delete('/delete')
  async deleteQuiz(
    @ReqId() reqId: string,
    @Body() dto: DeleteQuizDto,
    @User() user: UserModel,
  ) {
    const meta = { requestId: reqId };

    try {
      const payload = await this.quizzesService.deleteQuiz(meta, dto, user.sub);

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'quiz.delete failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
