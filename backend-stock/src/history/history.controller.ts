import { Controller, Get, Post, Body, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { HistoryService } from './history.service';
import { Roles } from '../auth/roles.decorator';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get()
  async findAll() {
    return this.historyService.findAll();
  }

  @Roles('ADMIN', 'MANAGER')
  @Post()
  async create(@Body() data: { machineId: number; from?: string | null; to: string }) {
    return this.historyService.create(data);
  }

  @Roles('ADMIN', 'MANAGER')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.historyService.remove(id);
    return { success: true };
  }
}
