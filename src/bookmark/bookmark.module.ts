import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { ResponseModule } from 'src/response/response.module';
import { ConfigModule } from '@nestjs/config';
import { ConstantsService } from 'src/constants/constants.service';

@Module({
    providers: [ResponseService,PrismaService,BookmarkService,ConstantsService],
    controllers: [BookmarkController],
    exports:[BookmarkService],
    imports:[ConfigModule,ResponseModule]
})
export class BookmarkModule {

}
