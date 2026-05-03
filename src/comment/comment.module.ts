import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { ResponseModule } from 'src/response/response.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConstantsModule } from 'src/constants/constants.module';
import { CommentService } from './comment.service';

@Module({
    controllers: [CommentController],
    imports:[ResponseModule,ConfigModule,PrismaModule,ConstantsModule],
    exports:[CommentService],
    providers:[CommentService]
  })
export class CommentModule {}
