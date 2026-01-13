import { PartialType } from '@nestjs/mapped-types';
import { SubmitQuizDto } from './submit-analytics.dto';

export class UpdateAnalyticsDto extends PartialType(SubmitQuizDto) {
  id: number;
}
