import { Controller, Post, Body, Get, Put, Param, Delete } from '@nestjs/common';
import { MachineService } from './machine.service';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/roles.decorator';

type CreateDto = {
  type: string;
  reference: string;
  numSerie: string;
  numInventaire: string;
};

type UpdateDto = Partial<CreateDto> & {
  status?: 'stocké' | 'affectée' | 'délivrée' | string;
  destinationId?: number | null;
};
@Public()
@Controller('machines')
export class MachineController {
  constructor(
    private readonly machineService: MachineService,
    private readonly prisma: PrismaService,
  ) {}
  @Public()
  @Post()
  create(@Body() body: CreateDto) {
    return this.machineService.create(body);
  }
  @Public()
  @Get()
  findAll() {
    return this.machineService.findAll();
  }
  @Public()
  @Get('stock')
  findStock() {
    return this.machineService.findStock();
  }
  @Public()
  @Get('destination/:id')
  findByDestination(@Param('id') id: string) {
    return this.machineService.findByDestination(Number(id));
  }

  /** -------- Réparations -------- */
  @Public()
  @Get('repairs')
  findRepairs() {
    return this.machineService.findRepairs();
  }
  @Public()
  @Put(':id/finish-repair')
  finishRepair(@Param('id') id: string) {
    return this.machineService.finishRepair(+id);
  }
  /** ------------------------------ */
  @Public()
  @Put('check-delivered')
  checkDelivered() {
    return this.machineService.updateDeliveredMachines();
  }
  @Public()
  @Get('delivrees')
  findDelivered() {
    return this.machineService.findDelivered();
  }
  @Public()
  @Put(':id/deliver')
  markAsDelivered(@Param('id') id: string) {
    return this.machineService.markAsDelivered(+id);
  }
  @Public()
  @Put(':id')
  updateOne(@Param('id') id: string, @Body() body: UpdateDto) {
    return this.machineService.update(+id, body);
  }
  @Public()
  @Delete(':id')
  deleteOne(@Param('id') id: string) {
    return this.machineService.delete(+id);
  }
  @Public()
  @Post('bulk-delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.machineService.bulkDelete(body.ids || []);
  }


}
