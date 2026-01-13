import { PartialType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto';

export class DeleteQuizDto extends PartialType(CreateQuizDto) {
  id: number;
}
