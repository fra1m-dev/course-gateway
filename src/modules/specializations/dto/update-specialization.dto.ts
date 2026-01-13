import { PartialType } from '@nestjs/mapped-types';
import { CreateSpecializationsDto } from './create-specialization.dto';

export class UpdateSpecializationDto extends PartialType(
  CreateSpecializationsDto,
) {
  id: number;
}
