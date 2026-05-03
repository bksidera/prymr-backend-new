import { Module } from '@nestjs/common';
import { SaleService } from './sale.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseService } from 'src/response/response.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConstantsService } from 'src/constants/constants.service';
import { ConfigModule } from '@nestjs/config';
import { ResponseModule } from 'src/response/response.module';
import { SaleController } from './sale.controller';

@Module({
    providers: [ResponseService,PrismaService,ConstantsService,SaleService],
    controllers: [SaleController],
    exports:[SaleService],
    imports:[ConfigModule,ResponseModule]
})
export class SaleModule {}
