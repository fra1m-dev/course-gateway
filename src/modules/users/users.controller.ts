// TODO: Проверить работоспособность контроллера
import { Response } from 'express';
import {
  Body,
  Controller,
  HttpStatus,
  Logger,
  Post,
  Res,
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
    @Body() userDto: CreateUserDto,
    @ReqId() reqId: string,
    @Res() res: Response,
  ) {
    Logger.debug('users.registration', reqId);
    const meta = { requestId: reqId };

    try {
      const { password, ...userData } = userDto;

      const exists = await this.usersService.getByEmail(meta, {
        email: userData.email,
      });

      if (exists) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: 'Пользователь с таким email уже существует' });
      }

      const user = await this.usersService.createUser(meta, userData);
      if (user instanceof ApiError) {
        return res
          .status(HttpStatus.BAD_REQUEST)
          .json({ message: user.message });
      }

      const passwordHash = await this.authService.createHash(meta, password);
      // TODO: Подумай нужно ли обрабтывать ошибку после создания хеша
      // if (passwordHash instanceof ApiError) {
      //   return res
      //     .status(HttpStatus.BAD_REQUEST)
      //     .json({ message: passwordHash.message });
      // }
      await this.authService.createCredentials(meta, {
        userId: user.id,
        passwordHash,
      });

      const tokens = await this.authService.generateTokens(meta, {
        id: user.id,
        email: user.email,
      });

      return res.status(HttpStatus.OK).json({
        message: 'Congratulations, you can study',
        payload: { user, tokens },
      });
    } catch (error: any) {
      // здесь уже упали из rpc() — отдаём понятное сообщение
      const msg = error?.message ?? 'Unknown error';
      return res.status(HttpStatus.BAD_REQUEST).json({ message: msg });
    }
  }

  //TODO: реализовать едпоинт логина
}
