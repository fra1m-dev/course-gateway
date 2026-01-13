import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSpecializationsDto {
  @ApiProperty({ example: 'napravlenie', description: 'Кратное название' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    example: 'Управление связьюми с клиентами',
    description: 'Название специализации',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Изучиение основ управления связями с клиентами',
    description: 'Описание специализации',
  })
  @IsString()
  description?: string;
}
