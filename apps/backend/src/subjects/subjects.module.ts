import { Module } from '@nestjs/common';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';
import { PrismaService } from '../database/prisma.service';

@Module({
  controllers: [SubjectsController],
  providers: [SubjectsService, PrismaService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
