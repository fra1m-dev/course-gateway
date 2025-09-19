import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common';
import { ValidationPipe as ContractsValidationPipe } from '@fra1m-dev/contracts-auth';
import { randomUUID, randomBytes } from 'node:crypto';

function genRequestId(): string {
  try {
    return randomUUID(); // Node 16+ есть всегда
  } catch {
    return randomBytes(16).toString('hex'); // запасной путь
  }
}

function requestIdMiddleware(req: any, res: any, next: any) {
  const incoming = req.headers['x-request-id'] as string | undefined;
  const rid = incoming?.trim() || genRequestId();
  // кладём в req, чтобы дальше можно было читать в контроллерах/логах
  req.headers['x-request-id'] = rid;
  // и в ответ — чтобы фронт видел тот же id
  res.setHeader('x-request-id', rid);
  next();
}

async function bootstrap() {
  // Только HTTP-приложение. Без connectMicroservice().
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Безопасность и сеть
  app.use(helmet());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? true,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders:
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Request-Id',
    exposedHeaders: 'x-request-id',
  });
  app.use(requestIdMiddleware);

  // Префикс и версионирование маршрутов: /api/v1/...
  const prefix = process.env.API_PREFIX ?? 'api';
  app.setGlobalPrefix(prefix);
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Глобальная валидация (из либы)
  app.useGlobalPipes(new ContractsValidationPipe());

  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 3005);
  await app.listen(port);
  const url = await app.getUrl();

  console.log(`[gateway] listening on ${url}/${prefix}/v1`);
}
void bootstrap();
