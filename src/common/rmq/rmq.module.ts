// TODO: разобраться какие аргументы очереди/соединения нужны
import { Module, DynamicModule } from '@nestjs/common';
import { ClientsModule, Transport, RmqOptions } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';

export const AUTH_CLIENT = 'AUTH_CLIENT';
export const USERS_CLIENT = 'USERS_CLIENT';

export function buildRmqOptions(
  cfg: ConfigService,
  queueEnv: string,
  defQueue: string,
): RmqOptions {
  const url = cfg.getOrThrow<string>('RABBITMQ_URL');
  const queue = cfg.get<string>(queueEnv) ?? defQueue;

  // DLX/TTL/лимит — брокерский «предохранитель» от захламления
  const dlx = cfg.get<string>('RMQ_DLX') ?? 'dlx';
  const ttl = Number(cfg.get<string>('RMQ_MESSAGE_TTL_MS') ?? 30000);
  const maxLen = Number(cfg.get<string>('RMQ_MAX_LENGTH') ?? 100000);

  return {
    transport: Transport.RMQ,
    options: {
      urls: [url],
      queue,
      queueOptions: {
        durable: true, // очередь переживёт рестарт брокера (не volatile)
        // Аргументы уровня очереди (amqplib-поддержка):
        arguments: {
          'x-dead-letter-exchange': dlx, // куда падать «плохим» сообщениям
          'x-message-ttl': ttl, // TTL сообщений в очереди
          'x-max-length': maxLen, // верхняя граница по количеству сообщений
        },
      },
      // Публикация сообщений как persistent (важно для сохранности при падениях)
      persistent: true,
      // heartbeat / socket tune при необходимости:
      // socketOptions: { heartbeat: 15 },
    },
  };
}

export function registerRmqClient(
  token: string,
  queueEnv: string,
  defQueue: string,
) {
  return ClientsModule.registerAsync([
    {
      name: token,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): RmqOptions =>
        buildRmqOptions(cfg, queueEnv, defQueue),
    },
  ]);
}

@Module({})
export class RmqModule {
  static forServices(): DynamicModule {
    return {
      module: RmqModule,
      imports: [
        registerRmqClient(AUTH_CLIENT, 'RMQ_AUTH_QUEUE', 'auth'),
        registerRmqClient(USERS_CLIENT, 'RMQ_USERS_QUEUE', 'users'),
      ],
      exports: [AUTH_CLIENT, USERS_CLIENT],
    };
  }
}
