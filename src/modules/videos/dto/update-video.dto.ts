import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateVideoDto {
  @ApiPropertyOptional({ example: 'Intro lesson', description: 'Video title' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Short description', description: 'Details' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 12, description: 'Course ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  courseId?: number;

  @ApiPropertyOptional({ example: 34, description: 'Lesson ID' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  lessonId?: number;

  @ApiPropertyOptional({ example: 360, description: 'Duration in seconds' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  durationSec?: number;
}
