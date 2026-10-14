import { Module } from '@nestjs/common';
import { GradesController } from './grades.controller';
import { GradesService } from './grades.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [GradesController],
  providers: [GradesService, PrismaService],
  exports: [GradesService],
})
export class GradesModule {}
