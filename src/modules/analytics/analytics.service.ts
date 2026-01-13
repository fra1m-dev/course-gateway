import { Inject, Injectable } from '@nestjs/common';
import { ANALYTICS_CLIENT } from 'src/common/rmq/rmq.module';
import { ClientProxy } from '@nestjs/microservices';
import { SubmitQuizDto } from './dto/submit-analytics.dto';
import { AnalyticModel } from './models/analytics-model';
import { PATTERNS } from 'src/contracts/patterns';
import { rpc } from 'src/common/rpc/rpc.util';
import { AggModel } from './models/agg-model';
import { UserStatsModel } from '../users/models/user-stats-model';

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_CLIENT) private readonly analytics: ClientProxy,
  ) {}

  async submitQuizAttempt(
    meta: { requestId: string },
    dto: SubmitQuizDto,
    userId: number,
    stats: UserStatsModel,
  ): Promise<AnalyticModel> {
    const analytics = await rpc<AnalyticModel>(
      this.analytics,
      PATTERNS.ANALYTICS_SUBMIT,
      {
        meta,
        dto,
        userId,
        stats,
      },
    );

    return analytics;
  }

  async getAggByUserId(
    meta: { requestId: string },
    userId: number,
  ): Promise<AggModel> {
    const agg = await rpc<AggModel>(this.analytics, PATTERNS.ANALYTICS_SUBMIT, {
      meta,
      userId,
    });

    return agg;
  }
}
