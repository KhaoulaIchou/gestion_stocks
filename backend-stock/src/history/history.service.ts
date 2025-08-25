import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(data: { machineId: number; from?: string | null; to: string }) {


    return this.prisma.history.create({ data });
  }

  async remove(id: number) {
    try {
      await this.prisma.history.delete({ where: { id } });
    } catch (e: any) {
      if (e?.code === 'P2025') {
        throw new NotFoundException('Mouvement introuvable');
      }
      throw e;
    }
  }
}
