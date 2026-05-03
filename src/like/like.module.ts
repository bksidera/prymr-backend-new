import { Module } from '@nestjs/common';
import { LikeController } from './like.controller';
import { ResponseModule } from 'src/response/response.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConstantsModule } from 'src/constants/constants.module';
import { LikeService } from './like.service';


@Module({
    controllers: [LikeController],
    imports:[ResponseModule,ConfigModule,PrismaModule,ConstantsModule],
    exports:[LikeService],
    providers:[LikeService]
  })
export class LikeModule {}
