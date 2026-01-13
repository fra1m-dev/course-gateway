import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ChoiceDto {
  @ApiProperty({ example: 'choice_1', description: 'Значение варианта ответа' })
  @IsString()
  value: string;

  @ApiProperty({
    example: 'Первый вариант',
    description: 'Текст варианта ответа',
  })
  @IsString()
  text: string;
}

export class QuestionDto {
  @ApiProperty({
    example: 'radiogroup',
    description: 'Тип вопроса (text, radiogroup, checkbox и т.д.)',
  })
  @IsString()
  type: string;

  @ApiProperty({
    example: 'q1',
    description: 'Уникальный идентификатор вопроса',
  })
  @IsString()
  name: string;

  @IsOptional()
  @ApiProperty({
    example: 'Какой ваш любимый цвет?',
    description: 'Текст вопроса',
  })
  @IsString()
  title?: string;

  @IsOptional()
  @ApiProperty({
    type: [ChoiceDto],
    required: false,
    description: 'Список вариантов ответа (если применимо)',
  })
  @ValidateNested({ each: true })
  @Type(() => ChoiceDto)
  @IsArray()
  choices?: ChoiceDto[];

  @IsOptional()
  @ApiProperty({
    example: true,
    required: false,
    description: 'Обязателен ли вопрос к заполнению',
  })
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @ApiProperty({
    example: ['1', '2'],
    required: false,
    description: 'Правильный ответ (строка или массив строк)',
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
  })
  correctAnswer?: any;

  @IsOptional()
  @ApiProperty({
    example:
      '<h3>Добро пожаловать! Нажмите "Начать тест", чтобы приступить.</h3>',
    description: 'HTML-контент',
  })
  @IsString()
  html?: string;
}

export class PageDto {
  @ApiProperty({ example: 'page1', description: 'Имя страницы' })
  @IsString()
  name: string;

  @IsOptional()
  @ApiProperty({ example: 'Вопрос 1', description: 'Имя страницы' })
  @IsString()
  title?: string;

  @ApiProperty({
    type: [QuestionDto],
    description: 'Список вопросов на странице',
  })
  @ValidateNested({ each: true })
  @Type(() => QuestionDto)
  @IsArray()
  elements: QuestionDto[];
}

export class SurveyJsonDto {
  @ApiProperty({
    example: 'Тест по программированию',
    description: 'Название опроса',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'top',
    enum: ['top', 'bottom', 'none'],
    description: 'Расположение индикатора прогресса',
  })
  @IsString()
  showProgressBar: 'top' | 'bottom' | 'none';

  @ApiProperty({
    example: true,
    description: 'Показывать ли кнопки навигации',
  })
  @IsBoolean()
  showNavigationButtons: boolean;

  @ApiProperty({
    example: true,
    description: 'Показывать ли стартовую страницу отдельно',
  })
  @IsBoolean()
  firstPageIsStarted: boolean;

  @ApiProperty({
    example: 'Начать тест',
    description: 'Текст кнопки начала теста',
  })
  @IsString()
  startSurveyText: string;

  @ApiProperty({
    example: '<h4>Спасибо за прохождение теста!</h4>',
    description: 'HTML, отображаемый после завершения опроса',
  })
  @IsString()
  completedHtml: string;

  @ApiProperty({
    type: [PageDto],
    description: 'Массив страниц с вопросами',
  })
  @ValidateNested({ each: true })
  @Type(() => PageDto)
  @IsArray()
  pages: PageDto[];
}

export class CreateQuizDto {
  @ApiProperty({
    type: SurveyJsonDto,
    description: 'Полная JSON-конфигурация опроса (SurveyJS)',
  })
  @ValidateNested()
  @Type(() => SurveyJsonDto)
  surveyJson: SurveyJsonDto;
}
