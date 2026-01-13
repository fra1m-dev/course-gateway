import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class LessonPageDto {
  @ApiProperty({ example: 1, description: 'Страница начала' })
  @IsInt()
  @Min(1)
  startWith: number;

  @ApiProperty({ example: 10, description: 'Страница конца' })
  @IsInt()
  @Min(1)
  end: number;
}

export class CreateLessonDto {
  @ApiProperty({
    example: 'Что такое TypeScript?',
    description: 'Название урока',
  })
  @IsString()
  @IsDefined()
  title: string;

  @ApiProperty({ type: LessonPageDto, description: 'Диапазон страниц урока' })
  @ValidateNested()
  @Type(() => LessonPageDto)
  @IsDefined()
  pages: LessonPageDto;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'ID курса (Course), связанного с уроком',
  })
  @IsInt()
  courseId: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'ID теста (Quiz), связанного с уроком',
  })
  @IsInt()
  @IsOptional()
  quizId?: number;
}
