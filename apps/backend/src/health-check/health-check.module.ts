import { Module } from '@nestjs/common';
import { HealthCheckController } from './health-check.controller';
import { HealthCheckService } from './health-check.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [HealthCheckController],
  providers: [HealthCheckService, PrismaService],
  exports: [HealthCheckService],
})
export class HealthCheckModule {}
