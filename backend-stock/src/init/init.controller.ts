import { Controller, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('init')
export class InitController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async initializeDestinations() {
    const destinations = [
      { name: 'Tribunal de première instance de Safi - Présidence' },
      { name: 'Tribunal de première instance de Safi - Parquet (Parquet)' },
      { name: 'Tribunal de première instance de Safi - Section de famille' },
      { name: 'Centre du juge de la circulation de Safi' },
      { name: 'Tribunal de première instance de Essaouira - Présidence' },
      { name: 'Tribunal de première instance de Essaouira - Parquet' },
      { name: 'Tribunal de première instance de Youssoufia - Présidence' },
      { name: 'Tribunal de première instance de Youssoufia - Parquet' },
      { name: 'Cour d’appel de Safi - Présidence' },
      { name: 'Cour d’appel de Safi - Section de famille' },
      { name: 'Cour d’appel de Safi - Parquet' },
    ];

    for (const dest of destinations) {
      await this.prisma.destination.create({ data: dest });
    }

    return { message: 'Destinations insérées avec succès !' };
  }
}
