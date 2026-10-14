import { Module } from '@nestjs/common';
import { HostelController } from './hostel.controller';
import { HostelService } from './hostel.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [HostelController],
  providers: [HostelService, PrismaService],
  exports: [HostelService],
})
export class HostelModule {}
