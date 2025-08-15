import { Controller, Get, Post, Body } from '@nestjs/common';
import { HistoryService } from './history.service';
import { Public } from '../auth/roles.decorator';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}
  @Public()
  @Get()
  async findAll() {
    return this.historyService.findAll();
  }
  @Public()
  @Post()
  async create(@Body() data: { machineId: number; from: string; to: string }) {
    return this.historyService.create(data);
  }
}
