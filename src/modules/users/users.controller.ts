import { Response } from 'express';
import {
  Body,
  ConflictException,
  Controller,
  Get,
  HttpException,
  InternalServerErrorException,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthService } from '../auth/auth.service';
import { ReqId } from 'src/common/http/req-id.decorator';
import { CacheHelper } from 'src/common/redis/redis.service';
import { AuthUserDto } from './dto/authUser.dto';
import { UserModel } from './models/user-model';
import { Tokens } from '../auth/models/auth-model';

import { JwtAuthGuard } from 'src/common/secure/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/secure/guards/roles.quard';
import { Role, Roles } from 'src/common/decorators/roles-auth.decorator';
import { AppLogger } from 'src/common/logger/logger.service';
import { Cookies } from 'src/common/decorators/cookie.decorator';
import { User } from 'src/common/decorators/user.decorator';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly cache: CacheHelper,
    private readonly logger: AppLogger,
  ) {
    // this.logger.setContext(UsersController.name);
  }

  @ApiOperation({ summary: 'Регистрация пользователя', operationId: '1' })
  @Post('/registration')
  async registrationUser(
    @Body() dto: CreateUserDto,
    @ReqId() reqId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: UserModel; tokens: Tokens }> {
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

      // 5) Токены + кука
      const tokens = await this.authService.generateTokens(
        meta,
        created,
        password,
      );

      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      this.logger.info(
        { rid: reqId, id: created.sub },
        'users.registration done',
      );
      return { user: created, tokens };
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Создание пользователя (админ)', operationId: '1a' })
  @Post('/admin/create')
  async adminCreateUser(
    @Body() dto: CreateUserDto,
    @ReqId() reqId: string,
  ): Promise<{ user: UserModel }> {
    const meta = { requestId: reqId };
    const { password, ...userData } = dto;
    const email = userData.email.trim().toLowerCase();

    const lockKey = `admin:create:${email}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Registration in progress for this email');
    }

    this.logger.info({ rid: reqId, dto }, 'users.adminCreate started');
    try {
      const created = await this.usersService.createUser(meta, {
        ...userData,
        email,
      });

      await this.authService.createCredentials(meta, created.sub, password);

      this.logger.info(
        { rid: reqId, id: created.sub },
        'users.adminCreate done',
      );
      return { user: created };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.adminCreate failed');
      if (e instanceof HttpException) throw e;
      if (e?.code === '23505') {
        throw new ConflictException('User with this email already exists');
      }
      throw new InternalServerErrorException('Create user failed');
    } finally {
      await this.cache.del(lockKey);
    }
  }

  @ApiOperation({ summary: 'Авторизация пользователя', operationId: '2' })
  @Post('/login')
  async authUser(
    @Body() dto: AuthUserDto,
    @ReqId() reqId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    user: UserModel;
    tokens: Tokens;
  }> {
    const meta = { requestId: reqId };
    const email = dto.email.trim().toLowerCase();
    const password = dto.password;

    const lockKey = `auth:${email}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Registration in progress for this email');
    }

    this.logger.info({ rid: reqId, email }, 'users.auth started');
    try {
      // 1) user из кэша → БД при промахе
      const cacheKey = `user:email:${email}`;
      const cached = await this.cache.getJson<UserModel>(cacheKey);
      let user = cached && cached.sub ? cached : null;
      if (!user) {
        user = await this.usersService.getByEmail(meta, { email });
        if (!user)
          throw new UnauthorizedException('Не верный логин или пароль');
      }
      if (!user.sub) {
        throw new InternalServerErrorException('User id is missing');
      }

      // 2) проверка пароля в auth-сервисе
      const tokens = await this.authService.authByPassword(meta, {
        user,
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
          id: user.sub,
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
          user.sub,
          tokens.accessTtlSec ?? 900,
        );
      }
      if (tokens.refreshJti) {
        await this.cache.markSession(
          tokens.refreshJti,
          user.sub,
          tokens.refreshTtlSec ?? 30 * 24 * 3600,
        );
      }

      await this.cache.mapRequestToUser(reqId, user.sub);
      await this.cache.markOnline(user.sub, 60);

      this.logger.info({ rid: reqId, id: user.sub }, 'users.auth done');
      return { user, tokens };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.auth failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    } finally {
      await this.cache.del(lockKey);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/all')
  async getAllUsers(@ReqId() reqId: string) {
    const lockKey = `get:all:reqId:${reqId}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Registration in progress for this email');
    }

    this.logger.info({ rid: reqId }, 'users.getAll started');
    try {
      const payload = await this.usersService.getAllUsers();

      this.logger.info({ rid: reqId }, 'users.getAll done');
      return { payload };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.getAll failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    } finally {
      await this.cache.del(lockKey);
    }
  }

  @ApiCookieAuth('refreshToken')
  @Post('/refresh')
  async checkAuth(
    @Cookies('refreshToken') token: string,
    @ReqId() reqId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = { requestId: reqId };

    const lockKey = `post:refresh:reqId:${reqId}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Bad request');
    }

    this.logger.info({ rid: reqId }, 'users.refresh started');
    try {
      const { userId } = await this.authService.validRefreshToken(meta, token);

      if (userId === null) {
        throw new UnauthorizedException('Вам необходимо заново авторизоваться');
      }

      const user = await this.usersService.getUserById(meta, userId);
      if (!user) {
        throw new UnauthorizedException('Вам необходимо заново авторизоваться');
      }

      const tokens = await this.authService.generateTokens(meta, user);
      // выставляем новую refresh-куку
      const isProd = process.env.NODE_ENV === 'production';
      res.cookie('refreshToken', tokens.refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax',
        path: '/',
        maxAge: tokens.refreshTtlSec * 1000,
      });

      // // пометим сессии (если используешь)
      // if (r.accessJti) {
      //   await this.cache.markSession(r.accessJti, r.userId, r.accessTtlSec);
      // }
      // if (r.refreshJti) {
      //   await this.cache.markSession(r.refreshJti, r.userId, r.refreshTtlSec);
      // }
      // await this.cache.mapRequestToUser(reqId, r.userId);
      // await this.cache.markOnline(r.userId, 60);

      // // достанем user snapshot (как в login) — из кэша/или дернуть users-сервис
      // // можно опционально, если на фронте и так всё есть
      // // const user = await this.usersService.getById(meta, r.userId);

      this.logger.info(
        { rid: reqId },
        'users.getAll done' + JSON.stringify(tokens),
      );
      return { user, tokens };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.refresh failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    } finally {
      await this.cache.del(lockKey);
    }
  }

  //TODO: в будующем сделать так чтобы
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Выход из аккаунта' })
  // @ApiResponse({ status: 200, type: LogoutResponseSchema })
  @Post('/logout')
  async logout(
    @Cookies('refreshToken') token: string,
    @ReqId() reqId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meta = { requestId: reqId };

    const lockKey = `post:logout:reqId:${reqId}`;
    const lockOk = await this.cache.setPlainNX(lockKey, reqId, 30);
    if (!lockOk) {
      throw new ConflictException('Bad request');
    }

    try {
      if (!token) {
        throw new UnauthorizedException('Вам необходимо заново авторизоваться');
      }

      await this.authService.removeToken(meta, token);
      res.clearCookie('refreshToken');

      return { message: 'Вы вышли из аккаунта' };
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.logout failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    } finally {
      await this.cache.del(lockKey);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER, Role.STUDENT, Role.TEACHER, Role.ADMIN)
  @Get('/me/stats')
  async getUserStats(@User() user: UserModel, @ReqId() reqId: string) {
    const meta = { requestId: reqId };

    try {
      const payload = await this.usersService.getUserStatsById(meta, user.sub);

      this.logger.debug(payload, '/me/stats');

      return payload;
    } catch (e) {
      this.logger.error({ rid: reqId, err: e }, 'users.logout failed');
      if (e instanceof HttpException) throw e;
      throw new UnauthorizedException('Invalid credentials');
    }
  }
}
