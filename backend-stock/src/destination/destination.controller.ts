import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { DestinationService } from './destination.service';

@Controller('destinations')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  @Post()
  create(@Body() body: { name: string }) {
    return this.destinationService.create(body);
  }

  @Get()
  findAll() {
    return this.destinationService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.destinationService.findOne(+id);
  }
}