import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, IsOptional, IsPositive } from 'class-validator';

export class SubmitQuizDto {
  @ApiProperty({ example: 12 })
  @IsInt()
  @IsPositive()
  quizId: number;

  @ApiProperty({ example: 101, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  lessonId: number;

  @ApiProperty({ example: 7, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  courseId: number;

  @ApiProperty({ example: 10 })
  @IsInt()
  @Min(1)
  questionsTotal: number;

  @ApiProperty({ example: 8 })
  @IsInt()
  @Min(0)
  correctCount: number;
}
