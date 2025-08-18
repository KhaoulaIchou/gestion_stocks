import { Controller, Get, Post, Body } from '@nestjs/common';
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
  async create(@Body() data: { machineId: number; from: string; to: string }) {
    return this.historyService.create(data);
  }
}
