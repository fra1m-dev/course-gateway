import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SPECIALIZATIONS_CLIENT } from 'src/common/rmq/rmq.module';
import { SpecializationModel } from './models/specializations-model';
import { PATTERNS } from 'src/contracts/patterns';
import { rpc } from 'src/common/rpc/rpc.util';
import { CreateSpecializationsDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';

@Injectable()
export class SpecializationService {
  constructor(
    @Inject(SPECIALIZATIONS_CLIENT)
    private readonly specializations: ClientProxy,
  ) {}

  async getAllSpecializations(meta: {
    requestId: string;
  }): Promise<SpecializationModel[]> {
    const specializations = await rpc<SpecializationModel[]>(
      this.specializations,
      PATTERNS.SPECIALIZATIONS_ALL,
      {
        meta,
      },
    );
    return specializations;
  }

  async create(
    meta: { requestId: string },
    dto: CreateSpecializationsDto,
  ): Promise<SpecializationModel> {
    const specialization = await rpc<SpecializationModel>(
      this.specializations,
      PATTERNS.SPECIALIZATIONS_CREATE,
      {
        meta,
        dto,
      },
    );
    return specialization;
  }

  async update(
    meta: { requestId: string },
    id: number,
    dto: UpdateSpecializationDto,
  ) {
    const specialization = await rpc<SpecializationModel>(
      this.specializations,
      PATTERNS.SPECIALIZATIONS_UPDATE,
      {
        meta,
        id,
        dto,
      },
    );
    return specialization;
  }
}
