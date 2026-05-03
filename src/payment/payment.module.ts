import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';  // Import ConfigService
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ConstantsService } from 'src/constants/constants.service';
import Stripe from 'stripe';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ConstantsModule } from 'src/constants/constants.module';
import { ResponseModule } from 'src/response/response.module';
import * as bodyParser from 'body-parser';
@Module({
  imports: [
    ConfigModule,  // Import ConfigModule here
    ResponseModule,
    PrismaModule,
    ConstantsModule,
  ],
  providers: [
    ResponseService,
    PrismaService,
    ConstantsService,
    PaymentService,
    {
      provide: 'STRIPE',
      useFactory: (configService: ConfigService) => {
        const stripeSecretKey = configService.get<string>('STRIPE_SECRET_KEY'); 
        if (!stripeSecretKey) {
          throw new Error('STRIPE_SECRET_KEY is not defined in the environment variables');
        }
        return new Stripe(stripeSecretKey);
      },
      inject: [ConfigService],  // Inject ConfigService
    },
  ],
  controllers: [PaymentController],
  exports: [PaymentService],
})
export class PaymentModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(bodyParser.raw({ type: 'application/json' }))
      .forRoutes('payments/webhook'); // webhook route
  }
}
