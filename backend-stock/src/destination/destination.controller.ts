import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { DestinationService } from './destination.service';
import { Public } from '../auth/roles.decorator';

@Controller('destinations')
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}
  @Public()
  @Post()
  create(@Body() body: { name: string }) {
    return this.destinationService.create(body);
  }
  @Public()
  @Get()
  findAll() {
    return this.destinationService.findAll();
  }
  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.destinationService.findOne(+id);
  }
}