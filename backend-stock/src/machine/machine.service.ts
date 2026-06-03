import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const REPAIR_KEYS = ['réparation', 'en réparation', 'reparation'];

const isRepair = (s?: string | null) =>
  !!s && REPAIR_KEYS.some((k) => (s || '').toLowerCase().includes(k));

@Injectable()
export class MachineService {
  constructor(private prisma: PrismaService) {}

  private destinationLabel(destination: any): string {
    if (!destination) return 'Stock';
    const etab = destination.etablissement?.nom ?? '';
    const service = destination.service?.nom ?? '';
    const bureau = destination.bureau ?? '';
    return [etab, service, bureau].filter(Boolean).join(' - ') || 'Destination';
  }

  create(data: {
    type: string;
    reference?: string;
    numSerie?: string;
    numInventaire?: string;
    marque?: string;
    referenceMarche?: string;
    etat?: string;
    destinationId?: number | null;
    affectataireId?: number | null;
  }) {
    return this.prisma.machine.create({
      data: {
        ...data,
        status: data.destinationId ? 'affectée' : 'stocké',
      },
    });
  }

  private async createHistory(machineId: number, fromValue: string | null, toValue: string, actionType = 'MOUVEMENT') {
    return this.prisma.history.create({
      data: {
        machineId,
        actionType,
        fromValue,
        toValue,
      },
    });
  }

  private async getSourceBeforeRepair(machineId: number) {
    const hist = await this.prisma.history.findMany({
      where: { machineId },
      orderBy: { changedAt: 'asc' },
    });

    const isStock = (s?: string | null) =>
      !!s && (s.toLowerCase() === 'stock' || s.toLowerCase().includes('stock'));
    const isDelivered = (s?: string | null) =>
      !!s && (s.toLowerCase().includes('machines délivrées') || s.toLowerCase().includes('délivr'));

    let lastMeaningfulTo = '';

    for (const ev of hist) {
      const to = (ev.toValue || '').trim();
      if (isRepair(to)) return lastMeaningfulTo || '';
      if (to && !isStock(to) && !isRepair(to) && !isDelivered(to)) {
        lastMeaningfulTo = to;
      }
    }
    return lastMeaningfulTo || '';
  }

  findAll() {
    return this.prisma.machine.findMany({
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
        affectataire: true,
      },
    });
  }

  findStock() {
    return this.prisma.machine.findMany({
      where: { status: 'stocké', destinationId: null },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
        affectataire: true,
      },
    });
  }

  findByDestination(destinationId: number) {
    return this.prisma.machine.findMany({
      where: { destinationId },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
        affectataire: true,
      },
    });
  }

  findDelivered() {
    return this.prisma.machine.findMany({
      where: { status: 'délivrée' },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
        histories: {
          orderBy: { changedAt: 'desc' },
          take: 1,
          select: {
            fromValue: true,
            toValue: true,
            changedAt: true,
          },
        },
      },
    });
  }

  async assignDestination(id: number, destinationId: number) {
    const before = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
      },
    });
    if (!before) throw new NotFoundException('Machine introuvable');

    const dest = await this.prisma.destination.findUnique({
      where: { id: destinationId },
      include: {
        etablissement: true,
        service: true,
      },
    });
    if (!dest) throw new NotFoundException('Destination introuvable');

    const from = this.destinationLabel(before.destination);
    const to = this.destinationLabel(dest);

    const updated = await this.prisma.machine.update({
      where: { id },
      data: { destinationId, status: 'affectée' },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
        affectataire: true,
      },
    });

    await this.createHistory(id, from, to, 'AFFECTATION');

    return updated;
  }

  async updateDeliveredMachines(years = 5) {
    const thresholdDate = new Date();
    thresholdDate.setFullYear(thresholdDate.getFullYear() - years);

    const machinesToDeliver = await this.prisma.machine.findMany({
      where: {
        status: { not: 'délivrée' },
        histories: { some: { changedAt: { lte: thresholdDate } } },
      },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
      },
    });

    for (const m of machinesToDeliver) {
      const fromName = this.destinationLabel(m.destination);
      await this.createHistory(m.id, fromName, 'Machines délivrées', 'DELIVREE');

      await this.prisma.machine.update({
        where: { id: m.id },
        data: { status: 'délivrée' },
      });
    }

    return {
      updated: machinesToDeliver.length,
      machines: machinesToDeliver.map((m) => m.reference),
    };
  }

  async markAsDelivered(id: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
      },
    });
    if (!machine) throw new NotFoundException('Machine introuvable');

    const fromName = this.destinationLabel(machine.destination);

    await this.createHistory(id, fromName, 'Machines délivrées', 'DELIVREE');

    return this.prisma.machine.update({
      where: { id },
      data: { status: 'délivrée' },
    });
  }

  findRepairs() {
    return this.prisma.machine.findMany({
      where: {
        OR: [
          { status: { contains: 'réparation' } },
          { status: { contains: 'Réparation' } },
          { status: { contains: 'REPARATION' } },
          { status: { contains: 'reparation' } },
          { status: { contains: 'en réparation' } },
          { status: { contains: 'En réparation' } },
          { status: { contains: 'EN REPARATION' } },
        ],
      },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
        affectataire: true,
        histories: { orderBy: { changedAt: 'asc' } },
      },
    });
  }

  async finishRepair(id: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
      },
    });
    if (!machine) throw new NotFoundException('Machine introuvable');

    const sourceName = await this.getSourceBeforeRepair(id);
    if (!sourceName) throw new Error('Source introuvable dans l’historique');

    const dest = await this.prisma.destination.findFirst({
      where: { bureau: sourceName },
      include: {
        etablissement: true,
        service: true,
      },
    });

    if (!dest) throw new Error(`Destination "${sourceName}" introuvable`);

    const to = this.destinationLabel(dest);

    await this.createHistory(id, 'Réparation', to, 'FIN_REPARATION');

    return this.prisma.machine.update({
      where: { id },
      data: {
        status: 'affectée',
        destinationId: dest.id,
      },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
      },
    });
  }

  async update(
    id: number,
    data: Partial<{
      type: string;
      reference: string;
      numSerie: string;
      numInventaire: string;
      marque: string;
      referenceMarche: string;
      etat: string;
      status: string;
      destinationId: number | null;
      affectataireId: number | null;
    }>,
  ) {
    const current = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
      },
    });
    if (!current) throw new NotFoundException('Machine introuvable');

    if (data.status && data.status.toLowerCase().includes('réparation')) {
      const fromName = this.destinationLabel(current.destination);

      await this.createHistory(id, fromName, 'Réparation', 'REPARATION');

      if (current.destinationId) {
        data.destinationId = null;
      }
    }

    return this.prisma.machine.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.reference !== undefined ? { reference: data.reference } : {}),
        ...(data.numSerie !== undefined ? { numSerie: data.numSerie } : {}),
        ...(data.numInventaire !== undefined ? { numInventaire: data.numInventaire } : {}),
        ...(data.marque !== undefined ? { marque: data.marque } : {}),
        ...(data.referenceMarche !== undefined ? { referenceMarche: data.referenceMarche } : {}),
        ...(data.etat !== undefined ? { etat: data.etat } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.destinationId !== undefined ? { destinationId: data.destinationId } : {}),
        ...(data.affectataireId !== undefined ? { affectataireId: data.affectataireId } : {}),
      },
      include: {
        destination: {
          include: {
            etablissement: true,
            service: true,
          },
        },
        affectataire: true,
      },
    });
  }

  async delete(id: number) {
    await this.prisma.history.deleteMany({ where: { machineId: id } });
    return this.prisma.machine.delete({ where: { id } });
  }

  async bulkDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };

    await this.prisma.history.deleteMany({
      where: { machineId: { in: ids } },
    });

    const res = await this.prisma.machine.deleteMany({
      where: { id: { in: ids } },
    });

    return { deleted: res.count };
  }

  async assign(id: number, destinationId: number) {
    return this.assignDestination(id, destinationId);
  }
}