import { Module } from '@nestjs/common';
import { RmqModule } from 'src/common/rmq/rmq.module';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';

@Module({
  imports: [RmqModule.forVideos()],
  controllers: [VideosController],
  providers: [VideosService],
  exports: [VideosService],
})
export class VideosModule {}
