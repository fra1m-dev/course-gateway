import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateCourseDto {
  @ApiProperty({ example: 'Основы TypeScript', description: 'Название курса' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Изучите базовые концепции TypeScript',
    description: 'Описание курса',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    example: 3,
    description: 'ID специализации курса',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  specializationId: number;
}
