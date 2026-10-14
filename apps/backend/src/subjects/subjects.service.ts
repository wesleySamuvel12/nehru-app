import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: any) {
    return { items: [], total: 0, module: 'subjects' };
  }

  async findOne(id: string) {
    return { id, module: 'subjects', status: 'active' };
  }

  async create(data: any) {
    return { id: 'generated-id', ...data, module: 'subjects', createdAt: new Date() };
  }

  async update(id: string, data: any) {
    return { id, ...data, module: 'subjects', updatedAt: new Date() };
  }

  async remove(id: string) {
    return { success: true, id, message: 'Deleted successfully' };
  }
}
