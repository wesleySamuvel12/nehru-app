import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: any) {
    return { items: [], total: 0, module: 'notifications' };
  }

  async findOne(id: string) {
    return { id, module: 'notifications', status: 'active' };
  }

  async create(data: any) {
    return { id: 'generated-id', ...data, module: 'notifications', createdAt: new Date() };
  }

  async update(id: string, data: any) {
    return { id, ...data, module: 'notifications', updatedAt: new Date() };
  }

  async remove(id: string) {
    return { success: true, id, message: 'Deleted successfully' };
  }
}
