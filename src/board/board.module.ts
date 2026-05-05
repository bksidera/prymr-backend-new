import { Module } from '@nestjs/common';
import { BoardController } from './board.controller';
import { ResponseModule } from 'src/response/response.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BoardService } from './board.service';
import { ConstantsModule } from 'src/constants/constants.module';
import { CommonService } from 'src/common/common.service';
import { PaymentService } from 'src/payment/payment.service';

@Module({
  controllers: [BoardController],
  imports:[ResponseModule,ConfigModule,PrismaModule,ConstantsModule],
  exports:[BoardService],
  providers:[BoardService,CommonService,PaymentService]
})
export class BoardModule {}
