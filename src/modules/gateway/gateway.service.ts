//TODO: расписать логику сервиса (возможно создать отдельные модули для работы с микросервисами)
import { Injectable } from '@nestjs/common';
import { CreateGatewayDto } from './dto/create-gateway.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';

@Injectable()
export class GatewayService {
  create(createGatewayDto: CreateGatewayDto) {
    return `This action adds a new gateway ${JSON.stringify(createGatewayDto)}`;
  }

  findAll() {
    return `This action returns all gateway`;
  }

  findOne(id: number) {
    return `This action returns a #${id} gateway`;
  }

  update(id: number, updateGatewayDto: UpdateGatewayDto) {
    return `This action updates a #${id} gateway ${JSON.stringify(updateGatewayDto)}`;
  }

  remove(id: number) {
    return `This action removes a #${id} gateway`;
  }
}
