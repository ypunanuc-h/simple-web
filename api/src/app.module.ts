import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from './data-source';
import { HealthController } from './health.controller';
import { CLOCK, SystemClock } from './common/clock';

@Module({
  imports: [TypeOrmModule.forRoot(buildDataSourceOptions())],
  controllers: [HealthController],
  providers: [{ provide: CLOCK, useClass: SystemClock }],
  exports: [CLOCK],
})
export class AppModule {}
