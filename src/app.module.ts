import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BcryptModule } from './bcrypt/bcrypt.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GuardsModule } from './guards/guards.module';
import { ResponseModule } from './response/response.module';
import { JwtStrategyModule } from './jwt-strategy/jwt-strategy.module';

import { CorsMiddlewareModule } from './cors-middleware/cors-middleware.module';
import { CorsMiddlewareService } from './cors-middleware/cors-middleware.service';
import { MailModule } from './mail/mail.module';
import { ConstantsService } from './constants/constants.service';
import { ConstantsModule } from './constants/constants.module';
import { CommonModule } from './common/common.module';
import { LoggerModule } from './logger/logger.module';
import { FileUploadService } from './file-upload/file-upload.service';
import { FileUploadModule } from './file-upload/file-upload.module';
import { MulterModule } from '@nestjs/platform-express';
import { CloudinaryModule, CloudinaryService } from 'nestjs-cloudinary';
import { BoardService } from './board/board.service';
import { BoardModule } from './board/board.module';
import { LocalStrategyModule } from './local-strategy/local-strategy.module';
import { PaymentModule } from './payment/payment.module';

import * as dotenv from 'dotenv';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    AuthModule,
    BcryptModule,
    GuardsModule,
    ResponseModule,
    JwtStrategyModule,

    CorsMiddlewareModule,
    MailModule,
    ConstantsModule,
    CommonModule,
    LoggerModule,
    FileUploadModule,
    MulterModule.register({
      dest: './uploads',
    }),
    BoardModule,
    LocalStrategyModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [AppService, ConstantsService, FileUploadService, BoardService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddlewareService)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
