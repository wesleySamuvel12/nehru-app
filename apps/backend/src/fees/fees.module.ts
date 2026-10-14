import { Module } from '@nestjs/common';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [FeesController],
  providers: [FeesService, PrismaService],
  exports: [FeesService],
})
export class FeesModule {}
