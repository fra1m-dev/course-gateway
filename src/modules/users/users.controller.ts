// TODO: Проверить работоспособность контроллера
import { Response } from 'express';
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  Roles,
  Role,
  ApiError,
} from '@fra1m-dev/contracts-auth';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';
import { ReqId } from 'src/common/http/req-id.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Регестрация пользователя', operationId: '1' })
  @Post('/registration')
  async registrationUser(
    @Body() dto: CreateUserDto,
    @ReqId() reqId: string,
  ): Promise<{ message: string; payload?: any }> {
    const meta = { requestId: reqId };
    const { password, ...userData } = dto;

    // 1) создаём юзера (без пароля)
    const created = await this.usersService.createUser(meta, userData);
    if (created instanceof ApiError) {
      throw new BadRequestException(created.message);
    }

    try {
      // 2) создаём учётку (Auth сам хэширует)
      const cred = await this.authService.createCredentials(meta, {
        userId: created.id,
        password,
      });
      if (cred instanceof ApiError) {
        // TODO: Компенсация, если нужно:
        // await this.usersService.delete(meta, created.id);
        throw new BadRequestException(cred.message);
      }

      // 3) выдаём токены (и сохраняем refresh внутри Auth)
      const tokens = await this.authService.generateTokens(meta, created);
      if (tokens instanceof ApiError) {
        throw new BadRequestException(tokens.message);
      }

      return {
        message: 'Congratulations, you can study',
        payload: { user: created, tokens },
      };
    } catch (e: any) {
      throw new BadRequestException(e?.message ?? 'Registration failed');
    }
  }

  //TODO: Реализовать едпоинт логина
}
