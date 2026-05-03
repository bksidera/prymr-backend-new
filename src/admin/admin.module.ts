import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ConstantsModule } from 'src/constants/constants.module';
import { ResponseModule } from 'src/response/response.module';

@Module({
  providers: [AdminService],
  controllers: [AdminController],
  imports:[ResponseModule,ConfigModule,PrismaModule,ConstantsModule]
})
export class AdminModule {

}

