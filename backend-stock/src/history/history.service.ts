import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.history.findMany({
      include: {
        machine: {
          select: {
            id: true,
            reference: true,
            type: true,
          },
        },
      },
      orderBy: {
        changedAt: 'desc',
      },
    });
  }

  async create(data: { machineId: number; from: string; to: string }) {
    return this.prisma.history.create({
      data,
    });
  }
}
