import { Module } from '@nestjs/common';
import { SecurityController } from './security.controller';
import { SecurityService } from './security.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [SecurityController],
  providers: [SecurityService, PrismaService],
  exports: [SecurityService],
})
export class SecurityModule {}
