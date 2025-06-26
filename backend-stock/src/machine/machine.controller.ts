import { Controller, Post, Body, Get, Put, Param } from '@nestjs/common';
import { MachineService } from './machine.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('machines')
export class MachineController {
  constructor(
    private readonly machineService: MachineService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  create(@Body() body: {
    type: string;
    reference: string;
    numSerie: string;
    numInventaire: string;
  }) {
    return this.machineService.create(body);
  }

  @Get()
  findAll() {
    return this.machineService.findAll();
  }

  @Get('stock')
  findStock() {
    return this.machineService.findStock();
  }

  @Get('destination/:id')
  findByDestination(@Param('id') id: string) {
    return this.machineService.findByDestination(Number(id));
  }

@Put(':id/assign')
async assignDestination(
  @Param('id') id: string,
  @Body() body: { destinationId: number },
) {
  const machine = await this.prisma.machine.findUnique({
    where: { id: Number(id) },
    include: { destination: true },
  });

  if (!machine) {
    throw new Error('Machine introuvable');
  }

  const newDestination = await this.prisma.destination.findUnique({
    where: { id: body.destinationId },
  });

  if (!newDestination) {
    throw new Error('Destination introuvable');
  }

  const updatedMachine = await this.prisma.machine.update({
    where: { id: Number(id) },
    data: {
      destinationId: body.destinationId,
      status: 'affectée',
    },
  });

  await this.prisma.history.create({
    data: {
      machineId: updatedMachine.id,
      from: machine.destination?.name || 'Stock',
      to: newDestination.name,
    },
  });

  return updatedMachine;
}
@Put('check-delivered')
checkDelivered() {
  return this.machineService.updateDeliveredMachines();
}

@Get('delivrees')
findDelivered() {
  return this.machineService.findDelivered();
}
@Put(':id/deliver')
markAsDelivered(@Param('id') id: string) {
  return this.machineService.markAsDelivered(+id);
}



}
