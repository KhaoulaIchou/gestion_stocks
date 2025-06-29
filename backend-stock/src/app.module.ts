import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MachineModule } from './machine/machine.module';
import { DestinationModule } from './destination/destination.module';
import { HistoryModule } from './history/history.module';
import { InitModule } from './init/init.module';


@Module({
  imports: [InitModule, PrismaModule, MachineModule, DestinationModule, HistoryModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

