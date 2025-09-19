//TODO: удалить закомментированный код после проверки работоспособности
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { ClientsModule, Transport } from '@nestjs/microservices';
import { envSchema } from './config/validation';
import { RmqModule } from './common/rmq/rmq.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      // cache: true,
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath:
        process.env.NODE_ENV === 'production' ? [] : ['.env', '../.env'],
      expandVariables: true,
    }),
    RmqModule.forServices(),
    // ClientsModule.registerAsync([
    //   {
    //     name: 'AUTH_CLIENT',
    //     imports: [ConfigModule],
    //     inject: [ConfigService],
    //     useFactory: (cfg: ConfigService) => ({
    //       transport: Transport.RMQ,
    //       options: {
    //         urls: [cfg.getOrThrow<string>('RMQ_URL')],
    //         queue: cfg.get<string>('RMQ_AUTH_QUEUE'),
    //         queueOptions: { durable: true },
    //       },
    //     }),
    //   },
    //   {
    //     name: 'USERS_CLIENT',
    //     imports: [ConfigModule],
    //     inject: [ConfigService],
    //     useFactory: (cfg: ConfigService) => ({
    //       transport: Transport.RMQ,
    //       options: {
    //         urls: [cfg.getOrThrow<string>('RMQ_URL')],
    //         queue: cfg.get<string>('RMQ_USERS_QUEUE'),
    //         queueOptions: { durable: true },
    //       },
    //     }),
    //   },
    // ]),
    HealthModule,
    UsersModule,
    AuthModule,
  ],
})
export class AppModule {}
