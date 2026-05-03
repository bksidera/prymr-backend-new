import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseModule } from 'src/response/response.module';
import { ConstantsModule } from 'src/constants/constants.module';

@Module({
  providers: [SocialService,PrismaService],
  controllers: [SocialController],
  exports:[SocialService],
  imports:[ConfigModule,ResponseModule,ConstantsModule]
})
export class SocialModule {}
//here  this module we can operate all the social activity
