import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { ConfigModule } from '@nestjs/config';
import { ResponseModule } from 'src/response/response.module';
import { ResponseService } from 'src/response/response.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConstantsService } from 'src/constants/constants.service';


@Module({
    providers: [ResponseService,PrismaService,CartService,ConstantsService],
    controllers: [CartController],
    exports:[CartService],
    imports:[ConfigModule,ResponseModule]
})
export class CartModule {}
