import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MachineService {
  constructor(private prisma: PrismaService) {}

  // Créer une machine (statut stocké par défaut)
  create(data: {
    type: string;
    reference: string;
    numSerie: string;
    numInventaire: string;
  }) {
    return this.prisma.machine.create({
      data: {
        ...data,
        status: 'stocké',
      },
    });
  }

  // Récupérer toutes les machines
  findAll() {
    return this.prisma.machine.findMany({
      include: { destination: true },
    });
  }

  // Récupérer uniquement les machines en stock (non affectées)
  findStock() {
    return this.prisma.machine.findMany({
      where: { status: 'stocké', destinationId: null },
    });
  }

  // Récupérer les machines affectées à une destination
  findByDestination(destinationId: number) {
    return this.prisma.machine.findMany({
      where: { destinationId },
    });
  }

  // Affecter une destination à une machine
  async assignDestination(id: number, destinationId: number) {
    return this.prisma.machine.update({
      where: { id },
      data: {
        destinationId,
        status: 'affectée',
      },
    });
  }

  async updateDeliveredMachines(years = 5) {
  const thresholdDate = new Date();
  thresholdDate.setFullYear(thresholdDate.getFullYear() - years);

  const machinesToDeliver = await this.prisma.machine.findMany({
    where: {
      status: { not: "délivrée" },
      histories: {
        some: {
          changedAt: { lte: thresholdDate }
        }
      }
    }
  });

  for (const machine of machinesToDeliver) {
    await this.prisma.machine.update({
      where: { id: machine.id },
      data: { status: "délivrée" }
    });
  }

  return {
    updated: machinesToDeliver.length,
    machines: machinesToDeliver.map((m) => m.reference),
  };
}

}
