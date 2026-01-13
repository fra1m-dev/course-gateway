import {
  Body,
  Controller,
  Get,
  HttpException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { SpecializationService } from './specializations.service';
import { Role, Roles } from 'src/common/decorators/roles-auth.decorator';
import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/secure/guards/roles.quard';
import { AppLogger } from 'src/common/logger/logger.service';
import { ReqId } from 'src/common/http/req-id.decorator';
import { CreateSpecializationsDto } from './dto/create-specialization.dto';
import { UpdateSpecializationDto } from './dto/update-specialization.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER)
@Controller('specializations')
export class SpecializationController {
  constructor(
    private readonly specializationsService: SpecializationService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(SpecializationController.name);
  }

  @Get('/all')
  async getAll(@ReqId() reqId: string) {
    const meta = { requestId: reqId };
    try {
      const payload =
        await this.specializationsService.getAllSpecializations(meta);

      return payload;
    } catch (e) {
      this.logger.error(
        { rid: reqId, err: e },
        'specializations.getAll failed',
      );
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Post('/create')
  async create(@ReqId() reqId: string, @Body() dto: CreateSpecializationsDto) {
    try {
      const meta = { requestId: reqId };

      const payload = await this.specializationsService.create(meta, dto);

      return payload;
    } catch (e) {
      this.logger.error(
        { rid: reqId, err: e },
        'specializations.create failed',
      );
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @ReqId() reqId: string,
    @Body() dto: UpdateSpecializationDto,
  ) {
    const meta = { requestId: reqId };
    try {
      const payload = await this.specializationsService.update(meta, id, dto);

      return payload;
    } catch (e) {
      this.logger.error(
        { rid: reqId, err: e },
        'specializations.update failed',
      );
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
