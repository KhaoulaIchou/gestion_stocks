import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DestinationService {
  constructor(private prisma: PrismaService) {}

  create(data: { name: string }) {
    return this.prisma.destination.create({ data });
  }

  findAll() {
    return this.prisma.destination.findMany({ include: { machines: true } });
  }

  findOne(id: number) {
    return this.prisma.destination.findUnique({ where: { id }, include: { machines: true } });
  }
}