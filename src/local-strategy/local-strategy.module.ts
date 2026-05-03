import { Module } from '@nestjs/common';
import { LocalStrategy } from './local-strategy.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BcryptService } from 'src/bcrypt/bcrypt.service';
import { ConfigModule } from '@nestjs/config';
import { ResponseModule } from 'src/response/response.module';
import { BcryptModule } from 'src/bcrypt/bcrypt.module';
import { MailModule } from 'src/mail/mail.module';
import { CacheModule } from '@nestjs/cache-manager';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';


@Module({
  imports: [ConfigModule, ResponseModule, BcryptModule, MailModule, CacheModule.register({ isGlobal: true }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '220d' }
    }),],
  providers: [LocalStrategy,PrismaService]
})
export class LocalStrategyModule {}
