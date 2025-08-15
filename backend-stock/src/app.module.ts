import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { MachineModule } from './machine/machine.module';
import { DestinationModule } from './destination/destination.module';
import { HistoryModule } from './history/history.module';
import { InitModule } from './init/init.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';


@Module({
  imports: [InitModule, PrismaModule, MachineModule, DestinationModule, HistoryModule, AuthModule, UsersModule,],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

