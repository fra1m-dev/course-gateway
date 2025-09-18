//TODO: реализовать едпоинт регестриции
//TODO: реализовать едпоинт логина
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { GatewayService } from './gateway.service';
import { CreateGatewayDto } from './dto/create-gateway.dto';
import { UpdateGatewayDto } from './dto/update-gateway.dto';

@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @MessagePattern('createGateway')
  create(@Payload() createGatewayDto: CreateGatewayDto) {
    return this.gatewayService.create(createGatewayDto);
  }

  @MessagePattern('findAllGateway')
  findAll() {
    return this.gatewayService.findAll();
  }

  @MessagePattern('findOneGateway')
  findOne(@Payload() id: number) {
    return this.gatewayService.findOne(id);
  }

  @MessagePattern('updateGateway')
  update(@Payload() updateGatewayDto: UpdateGatewayDto) {
    return this.gatewayService.update(updateGatewayDto.id, updateGatewayDto);
  }

  @MessagePattern('removeGateway')
  remove(@Payload() id: number) {
    return this.gatewayService.remove(id);
  }
}
