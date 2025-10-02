import { Response } from 'express';
import {
  Body,
  ConflictException,
  Controller,
  HttpException,
  InternalServerErrorException,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';
import { ReqId } from 'src/common/http/req-id.decorator';
import { CacheHelper } from 'src/common/redis/redis.service';
import { AuthUserDto } from './dto/authUser.dto';
import { UserModel } from './models/user-model';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly cache: CacheHelper,
    @InjectPinoLogger(UsersController.name) private readonly logger: PinoLogger,
  ) {}

  @ApiOperation({ summary: 'Регистрация пользователя', operationId: '1' })
  @Post('/registration')
  async registrationUser(
    @Body() dto: CreateUserDto,
    @ReqId() reqId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string; payload?: any }> {
    const meta = { requestId: reqId };
    const { password, ...userData } = dto;
    const email = userData.email.trim().toLowerCase();

    const lockKey = `reg:${email}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Registration in progress for this email');
    }
    this.logger.info({ rid: reqId, dto }, 'users.registration started');
    try {
      const created = await this.usersService.createUser(meta, {
        ...userData,
        email,
      });

      // 4) Создаём учётные данные
      await this.authService.createCredentials(meta, {
        userId: created.id,
        password,
      });

      // 5) Токены + кука
      const tokens = await this.authService.generateTokens(meta, created);
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      this.logger.info(
        { rid: reqId, id: created.id },
        'users.registration done',
      );
      return {
        message: 'Congratulations, you can study',
        payload: { user: created, accessToken: tokens.accessToken },
      };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.registration failed');
      if (e instanceof HttpException) throw e;
      // если БД кинула unique_violation, можно маппить в 409:
      if (e?.code === '23505') {
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException('Registration failed');
    } finally {
      await this.cache.del(lockKey);
    }
  }

  //TODO: доделать авторизацию
  @ApiOperation({ summary: 'Авторизация пользователя', operationId: '2' })
  @Post('/login')
  async authUser(
    @Body() dto: AuthUserDto,
    @ReqId() reqId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    message: string;
    payload: { user: UserModel; accessToken: string };
  }> {
    const meta = { requestId: reqId };
    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    const lockKey = `auth:${email}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Registration in progress for this email');
    }

    try {
      this.logger.info({ rid: reqId, email }, 'users.auth started');

      // 1) user из кэша → БД при промахе
      const cacheKey = `user:email:${email}`;
      let user = await this.cache.getJson<UserModel>(cacheKey);
      if (!user) {
        user = await this.usersService.getByEmail(meta, { email });
        if (!user) throw new UnauthorizedException('Invalid credentials');
      }

      // 2) проверка пароля в auth-сервисе
      const tokens = await this.authService.authByPassword(meta, {
        userId: user.id,
        password,
      });

      // 3) кука с refresh
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      // 4) прогреваем кэш пользователя (safe snapshot)
      await this.cache.writeUserCache(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        1800,
      );

      // 5) метки сессии (по JTI), если они есть в токенах
      //    это позволит делать logout/ревокацию/онлайн-индикатор
      if (tokens.accessJti) {
        await this.cache.markSession(
          tokens.accessJti,
          user.id,
          tokens.accessTtlSec ?? 900,
        );
      }
      if (tokens.refreshJti) {
        await this.cache.markSession(
          tokens.refreshJti,
          user.id,
          tokens.refreshTtlSec ?? 30 * 24 * 3600,
        );
      }

      // (не как источник истины, а для «онлайн»/телеметрии)
      await this.cache.mapRequestToUser(reqId, user.id);
      await this.cache.markOnline(user.id, 60);

      this.logger.info({ rid: reqId, id: user.id }, 'users.auth done');
      return {
        message: 'Welcome back!',
        payload: { user, accessToken: tokens.accessToken },
      };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.auth failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    } finally {
      await this.cache.del(lockKey);
    }
  }
}
