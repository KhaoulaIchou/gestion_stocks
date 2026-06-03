import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('init')
export class InitController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async initializeDestinations() {
    const etab = await this.prisma.etablissement.upsert({
      where: { nom: 'Non défini' },
      update: {},
      create: { nom: 'Non défini' },
    });

    const destinations = [
      'Tribunal de première instance de Safi - Présidence',
      'Tribunal de première instance de Safi - Parquet',
      'Tribunal de première instance de Safi - Section de famille',
      'Centre du juge de la circulation de Safi',
      'Tribunal de première instance de Essaouira - Présidence',
      'Tribunal de première instance de Essaouira - Parquet',
      'Tribunal de première instance de Youssoufia - Présidence',
      'Tribunal de première instance de Youssoufia - Parquet',
      'Cour d’appel de Safi - Présidence',
      'Cour d’appel de Safi - Section de famille',
      'Cour d’appel de Safi - Parquet',
    ];

    for (const bureau of destinations) {
      await this.prisma.destination.upsert({
      where: {
        etablissementId_bureau: {
          etablissementId: etab.id,
          bureau,
        },
      },
        update: {},
        create: {
          etablissementId: etab.id,
          serviceId: null,
          bureau,
        },
      });
    }

    return { message: 'Destinations insérées avec succès !' };
  }
}