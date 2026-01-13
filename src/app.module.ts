import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/validation';
import { RmqModule } from './common/rmq/rmq.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { LoggerModule } from './common/logger/logger.module';
import { AppCacheModule } from './common/redis/redis.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { HttpCacheInterceptor } from './common/redis/http-cache.interceptor';
import { AppBootstrapService } from './app.service';
import { SecurityModule } from './common/secure/secure.module';
import { RealtimeModule } from './modules/ws/ws.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SpecializationModule } from './modules/specializations/specializations.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envSchema,
      envFilePath:
        process.env.NODE_ENV === 'production' ? [] : ['.env', '../.env'],
      expandVariables: true,
    }),
    LoggerModule,
    SecurityModule,
    RmqModule.forServices(),
    AppCacheModule,
    HealthModule,
    // RealtimeModule,
    SpecializationModule,
    UsersModule,
    AuthModule,
    CoursesModule,
    LessonsModule,
    QuizzesModule,
    AnalyticsModule,
  ],
  providers: [
    AppBootstrapService,
    { provide: APP_INTERCEPTOR, useClass: HttpCacheInterceptor }, // 👈 добавили
  ],
})
export class AppModule {}
