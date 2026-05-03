import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { BcryptService } from 'src/bcrypt/bcrypt.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ResponseModule } from 'src/response/response.module';

import { BcryptModule } from 'src/bcrypt/bcrypt.module';
import { MailModule } from 'src/mail/mail.module';
import { ConstantsService } from 'src/constants/constants.service';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  controllers: [AuthController],
  imports: [ConfigModule, ResponseModule, BcryptModule, MailModule, CacheModule.register({ isGlobal: true }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '220d' }
    }),],
  providers: [AuthService, PrismaService, BcryptService, ConstantsService],
  exports: [AuthService]
})
export class AuthModule { }
