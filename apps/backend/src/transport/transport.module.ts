import { Module } from '@nestjs/common';
import { TransportController } from './transport.controller';
import { TransportService } from './transport.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [TransportController],
  providers: [TransportService, PrismaService],
  exports: [TransportService],
})
export class TransportModule {}
