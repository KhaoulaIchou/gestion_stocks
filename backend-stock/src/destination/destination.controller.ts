import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { Roles } from '../auth/roles.decorator';
@Controller('destinations')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}
  @Roles('ADMIN', 'MANAGER')
  @Post()
  create(@Body() body: { name: string }) {
    return this.destinationService.create(body);
  }
  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get()
  findAll() {
    return this.destinationService.findAll();
  }
  @Roles('ADMIN', 'MANAGER', 'VIEWER')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.destinationService.findOne(+id);
  }
}