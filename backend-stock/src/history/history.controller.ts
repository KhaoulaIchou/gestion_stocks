import { Controller, Get, Post, Body } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async findAll() {
    return this.historyService.findAll();
  }

  @Post()
  async create(@Body() data: { machineId: number; from: string; to: string }) {
    return this.historyService.create(data);
  }
}
