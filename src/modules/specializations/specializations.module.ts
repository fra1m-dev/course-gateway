import { Module } from '@nestjs/common';
import { SpecializationService } from './specializations.service';
import { SpecializationController } from './specializations.controller';
import { RmqModule } from 'src/common/rmq/rmq.module';

@Module({
  imports: [RmqModule.forSpecialization()],
  controllers: [SpecializationController],
  providers: [SpecializationService],
})
export class SpecializationModule {}
