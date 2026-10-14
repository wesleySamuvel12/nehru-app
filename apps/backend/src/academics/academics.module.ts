import { Module } from '@nestjs/common';
import { AcademicsController } from './academics.controller';
import { AcademicsService } from './academics.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [AcademicsController],
  providers: [AcademicsService, PrismaService],
  exports: [AcademicsService],
})
export class AcademicsModule {}
