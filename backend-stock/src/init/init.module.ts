import { Module } from '@nestjs/common';
import { InitController } from './init.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [InitController],
  providers: [PrismaService],
})
export class InitModule {}
