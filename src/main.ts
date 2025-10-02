//TODO: Все function вынести в отдельный файл (сервис)
//NOTE: Подумать нужен ли RpcToHttpExceptionFilter
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ValidationPipe as ContractsValidationPipe } from '@fra1m-dev/contracts-auth';
import { randomUUID, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import * as fs from 'fs';
import path from 'path';
import { CacheHelper } from './common/redis/redis.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

// import { RpcToHttpExceptionFilter } from './common/filters/rpc-to-http.filter';

function preloadSecrets() {
  // Если REDIS_PASSWORD ещё не задан, но есть файл секрета — читаем и прокидываем в env.
  if (!process.env.REDIS_PASSWORD && process.env.REDIS_PASSWORD_FILE) {
    try {
      const p = path.resolve(process.env.REDIS_PASSWORD_FILE);
      process.env.REDIS_PASSWORD = fs.readFileSync(p, 'utf8').trim();
    } catch (err) {
      // можно залогировать и упасть, если это критично

      console.error('Failed to load REDIS_PASSWORD from file:', err);
      process.exit(1);
    }
  }
}

function genRequestId(): string {
  try {
    return randomUUID();
  } catch {
    return randomBytes(16).toString('hex');
  }
}

function requestIdMiddleware(req: any, res: any, next: any) {
  const incoming = req.headers['x-request-id'] as string | undefined;
  const rid = incoming?.trim() || genRequestId();
  req.headers['x-request-id'] = rid;
  res.setHeader('x-request-id', rid);
  next();
}

function parseCorsOrigins(raw: string | undefined): true | string[] {
  if (!raw || raw.trim() === '*') return true;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : true;
}

async function bootstrap() {
  preloadSecrets();

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const cfg = app.get(ConfigService);

  const prefix = cfg.get<string>('API_PREFIX', { infer: true }) ?? 'api';
  const port = cfg.get<number>('PORT', { infer: true }) ?? 3001;
  const corsRaw = cfg.get<string>('CORS_ORIGIN', { infer: true }); // например: http://localhost:5173,https://my.app

  app.useLogger(app.get(Logger));

  process.on('unhandledRejection', (reason) => {
    const logger = app.get(Logger);
    logger.error({ reason }, 'UNHANDLED_REJECTION');
  });
  process.on('uncaughtException', (err) => {
    const logger = app.get(Logger);
    logger.fatal({ err }, 'UNCAUGHT_EXCEPTION');
    process.exit(1);
  });

  // Безопасность и сеть
  app.use(helmet());
  app.enableCors({
    origin: parseCorsOrigins(corsRaw),
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id',
    exposedHeaders: 'x-request-id',
  });
  app.use(requestIdMiddleware);

  // Префикс и версионирование маршрутов: /api/v1/...
  app.setGlobalPrefix(prefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Глобальная валидация
  app.useGlobalPipes(new ContractsValidationPipe());

  app.enableShutdownHooks();
  // app.useGlobalFilters(new RpcToHttpExceptionFilter());

  await app.listen(port);
  const url = await app.getUrl();
  const logger = app.get(Logger);

  const c: any = app.get(CACHE_MANAGER);
  const s: any = c?.store;
  app
    .get(Logger)
    .warn(
      { hasGetClient: !!s?.getClient, storeKeys: Object.keys(s || {}) },
      'cache.store.inspect',
    );

  app
    .get(Logger)
    .log(`[${process.env.SERVICE_NAME}] listening on ${url}/${prefix}/v1`);

  try {
    const cache = app.get(CacheHelper);
    const ok = await cache.ping();
    logger[ok ? 'log' : 'error']({ ok }, 'redis connectivity check');
  } catch (e) {
    logger.error({ err: e }, 'redis connectivity check failed');
  }
}

void bootstrap();
