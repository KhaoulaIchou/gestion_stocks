import { Controller, Post, Body, Get, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { MachineService } from './machine.service';
import { PrismaService } from '../prisma/prisma.service';
import { Roles } from '../auth/roles.decorator';


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
@Controller('machines')
export class MachineController {
  constructor(
    private readonly machineService: MachineService,
    private readonly prisma: PrismaService,
  ) {}
  @Roles('ADMIN', 'MANAGER')
  @Post()
  create(@Body() body: CreateDto) {
    return this.machineService.create(body);
  }
  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get()
  findAll() {
    return this.machineService.findAll();
  }
  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get('stock')
  findStock() {
    return this.machineService.findStock();
  }
  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get('destination/:id')
  findByDestination(@Param('id') id: string) {
    return this.machineService.findByDestination(Number(id));
  }

  /** -------- Réparations -------- */
  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get('repairs')
  findRepairs() {
    return this.machineService.findRepairs();
  }
  @Roles('ADMIN', 'MANAGER')
  @Put(':id/finish-repair')
  finishRepair(@Param('id') id: string) {
    return this.machineService.finishRepair(+id);
  }
  /** ------------------------------ */
  @Roles('ADMIN', 'MANAGER')
  @Put('check-delivered')
  checkDelivered() {
    return this.machineService.updateDeliveredMachines();
  }
  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get('delivrees')
  findDelivered() {
    return this.machineService.findDelivered();
  }
  @Roles('ADMIN', 'MANAGER')
  @Put(':id/deliver')
  markAsDelivered(@Param('id') id: string) {
    return this.machineService.markAsDelivered(+id);
  }
  @Roles('ADMIN', 'MANAGER')
  @Put(':id')
  updateOne(@Param('id') id: string, @Body() body: UpdateDto) {
    return this.machineService.update(+id, body);
  }
  @Roles('ADMIN')
  @Delete(':id')
  deleteOne(@Param('id') id: string) {
    return this.machineService.delete(+id);
  }
  @Roles('ADMIN')
  @Post('bulk-delete')
  bulkDelete(@Body() body: { ids: number[] }) {
    return this.machineService.bulkDelete(body.ids || []);
  }
  @Roles('ADMIN', 'MANAGER')
  @Put(':id/assign')
  async assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { destinationId: number },
  ) {
    return this.machineService.assign(id, body.destinationId);
  }
}
