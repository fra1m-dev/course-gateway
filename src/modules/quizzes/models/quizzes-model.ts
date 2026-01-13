import { ApiProperty } from '@nestjs/swagger';
import {
  PrimaryGeneratedColumn,
  Column,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { SurveyJsonDto } from '../dto/create-quiz.dto';

export class QuizzesModel {
  @ApiProperty({ example: 1, description: 'Уникальный идентификатор опроса' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    type: SurveyJsonDto,
    description: 'Полная JSON-конфигурация опроса (SurveyJS)',
  })
  @Column({ type: 'jsonb', nullable: false })
  surveyJson: SurveyJsonDto;

  @ApiProperty({
    example: '3',
    description: 'ID пользователя создавшего квиз',
  })
  @JoinColumn({ name: 'user_id' })
  userId: number;

  @ApiProperty({
    example: 1,
    description: 'ID урока, к которому относится опрос',
  })
  lessonId: number;

  @ApiProperty({
    example: '2024-05-30T15:49:54.000Z',
    description: 'Дата и время создания опроса',
  })
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;
}
