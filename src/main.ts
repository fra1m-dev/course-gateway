//TODO: Все function вынести в отдельный файл (сервис)
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ValidationPipe as ContractsValidationPipe } from '@fra1m-dev/contracts-auth';
import { randomUUID, randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';

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
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const cfg = app.get(ConfigService);

  const prefix = cfg.get<string>('API_PREFIX', { infer: true }) ?? 'api';
  const port = cfg.get<number>('PORT', { infer: true }) ?? 3005;
  const corsRaw = cfg.get<string>('CORS_ORIGIN', { infer: true }); // например: http://localhost:5173,https://my.app

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

  await app.listen(port);
  const url = await app.getUrl();
  console.log(`[gateway] listening on ${url}/${prefix}/v1`);
}

void bootstrap();
