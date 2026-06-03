import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DestinationService {
  constructor(private prisma: PrismaService) {}

  private async defaultEtablissement() {
    return this.prisma.etablissement.upsert({
      where: { nom: 'Non défini' },
      update: {},
      create: { nom: 'Non défini' },
    });
  }

  async create(data: { name?: string; bureau?: string; etablissementId?: number; serviceId?: number | null }) {
    const etab = data.etablissementId
      ? { id: data.etablissementId }
      : await this.defaultEtablissement();

    return this.prisma.destination.create({
      data: {
        etablissementId: etab.id,
        serviceId: data.serviceId ?? null,
        bureau: data.bureau ?? data.name ?? 'Stock',
      },
    });
  }

  findAll() {
    return this.prisma.destination.findMany({
      include: {
        etablissement: true,
        service: true,
        machines: true,
      },
    });
  }

  findOne(id: number) {
    return this.prisma.destination.findUnique({
      where: { id },
      include: {
        etablissement: true,
        service: true,
        machines: true,
      },
    });
  }
}