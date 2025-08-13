import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const REPAIR_KEYS = ['réparation', 'en réparation', 'reparation'];

const isRepair = (s?: string | null) =>
  !!s && REPAIR_KEYS.some(k => (s || '').toLowerCase().includes(k));

@Injectable()
export class MachineService {
  constructor(private prisma: PrismaService) {}
  create(data: {
    type: string;
    reference: string;
    numSerie: string;
    numInventaire: string;
  }) {
    return this.prisma.machine.create({
      data: { ...data, status: 'stocké' },
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
    const isRepair = (s?: string | null) =>
      !!s && (s.toLowerCase().includes('réparation') || s.toLowerCase().includes('reparation'));

    let lastMeaningfulTo = '';

    for (const ev of hist) {
      const to = (ev.to || '').trim();
      if (isRepair(to)) {
        // entrée en réparation: la source est ce qu'on a mémorisé juste avant
        return lastMeaningfulTo || '';
      }
      if (to && !isStock(to) && !isRepair(to) && !isDelivered(to)) {
        lastMeaningfulTo = to;
      }
    }
    return lastMeaningfulTo || '';
  }
  findAll() {
    return this.prisma.machine.findMany({ include: { destination: true } });
  }

  findStock() {
    return this.prisma.machine.findMany({
      where: { status: 'stocké', destinationId: null },
    });
  }

  findByDestination(destinationId: number) {
    return this.prisma.machine.findMany({ where: { destinationId } });
  }

  /** -------- Délivrées -------- */
  findDelivered() {
    return this.prisma.machine.findMany({
      where: { status: 'délivrée' },
      include: {
        destination: {
          select: {
            id: true,
            name: true,
          },
        },
        histories: {
          orderBy: { changedAt: 'desc' },
          take: 1,
          select: {
            from: true,
            changedAt: true,
          },
        },
      },
    });
  }

  async assignDestination(id: number, destinationId: number) {
    return this.prisma.machine.update({
      where: { id },
      data: { destinationId, status: 'affectée' },
    });
  }

  async updateDeliveredMachines(years = 5) {
    const thresholdDate = new Date();
    thresholdDate.setFullYear(thresholdDate.getFullYear() - years);

    const machinesToDeliver = await this.prisma.machine.findMany({
      where: {
        status: { not: 'délivrée' },
        histories: { some: { changedAt: { lte: thresholdDate } } },
      },
      include: { destination: true },
    });

    for (const m of machinesToDeliver) {
      const fromName = m.destination?.name || 'Affectée';
      await this.prisma.history.create({
        data: { machineId: m.id, from: fromName, to: 'Machines délivrées' },
      });
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
      include: { destination: true },
    });
    if (!machine) throw new Error('Machine introuvable');

    const fromName = machine.destination?.name || 'Affectée';
    const toName = 'Machines délivrées';

    await this.prisma.history.create({
      data: { machineId: id, from: fromName, to: toName },
    });

    return this.prisma.machine.update({
      where: { id },
      data: { status: 'délivrée' },
    });
  }

  /** =====================  RÉPARATION  ===================== */

  /** Liste des machines en réparation (sans `mode: 'insensitive'`) */
  findRepairs() {
    // Compat Prisma: on duplique les variantes au lieu d’un filtre insensible
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
        destination: true,
        histories: { orderBy: { changedAt: 'asc' } },
      },
    });
  }

    async finishRepair(id: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: { destination: true },
    });
    if (!machine) throw new Error('Machine introuvable');

    // 1) retrouver la juridiction source à partir de l’historique
    const sourceName = await this.getSourceBeforeRepair(id);
    if (!sourceName) throw new Error('Source introuvable dans l’historique');

    // 2) retrouver la destination par son "name" (ex: "TPI Safi – Greffe")
    const dest = await this.prisma.destination.findFirst({
      where: { name: sourceName },
    });
    if (!dest) throw new Error(`Destination "${sourceName}" introuvable`);

    // 3) traçabilité: de "Réparation" -> source
    await this.prisma.history.create({
      data: {
        machineId: id,
        from: 'Réparation',
        to: dest.name,
      },
    });

    // 4) MAJ machine: statut + rattachement à la destination
    return this.prisma.machine.update({
      where: { id },
      data: {
        status: 'affectée',
        destinationId: dest.id,
      },
    });
  }


  /** ======================================================== */

  async update(
    id: number,
    data: Partial<{
      type: string;
      reference: string;
      numSerie: string;
      numInventaire: string;
      status: 'stocké' | 'affectée' | 'délivrée' | string;
      destinationId: number | null;
    }>,
  ) {
    const { type, reference, numSerie, numInventaire, status, destinationId } =
      data;

    if (data.status && data.status.toLowerCase().includes('réparation')) {
      const m = await this.prisma.machine.findUnique({
        where: { id },
        include: { destination: true },
      });
      const fromName = m?.destination?.name || 'Stock';

      // créer l’évènement "entrée en réparation"
      await this.prisma.history.create({
        data: { machineId: id, from: fromName, to: 'Réparation' },
      });

      // détacher de la destination pendant la réparation
      if (m?.destinationId) {
        data.destinationId = null;
      }
    }

    return this.prisma.machine.update({
      where: { id },
      data: {
        ...(type !== undefined ? { type } : {}),
        ...(reference !== undefined ? { reference } : {}),
        ...(numSerie !== undefined ? { numSerie } : {}),
        ...(numInventaire !== undefined ? { numInventaire } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(destinationId !== undefined ? { destinationId } : {}),
      },
    });
  }

  async delete(id: number) {
    await this.prisma.history.deleteMany({ where: { machineId: id } });
    return this.prisma.machine.delete({ where: { id } });
  }

  async bulkDelete(ids: number[]) {
    if (!ids.length) return { deleted: 0 };
    await this.prisma.history.deleteMany({ where: { machineId: { in: ids } } });
    const res = await this.prisma.machine.deleteMany({
      where: { id: { in: ids } },
    });
    return { deleted: res.count };
  }
}
