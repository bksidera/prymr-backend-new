import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { HttpException, HttpStatus, RequestMethod, ValidationPipe } from '@nestjs/common';
import crypto from 'crypto';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';

// import * as session from 'express-session';

const port = process.env.PORT || 3000;
// console.info(process.env.AWS_ACCESSKEYID);
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, bodyParser: true });
  const configService = app.get(ConfigService);
  const BUCKETNAMEFORIMAGES=configService.get("AWS_S3_BUCKETNAMEFORIMAGES");
  const AWS_S3_BUCKETNAME=configService.get("AWS_S3_BUCKETNAME");
  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
  });
  app.setGlobalPrefix('backend-api', {
    exclude: [{ path: 'b/:boardId', method: RequestMethod.GET }],
  });
app.use(
  '/backend-api/payments/webhook',
  express.raw({ type: 'application/json' }),
);

  //--------------------------
  // @Vaibhav and sultan side changes
  // const nonce = crypto.randomBytes(16).toString('base64');

  // // Use helmet to set security headers, including HSTS
  // app.use(
  //   helmet({
  //     strictTransportSecurity: {
  //       maxAge: 63072000,
  //       preload: true,
  //       includeSubDomains: true,
  //     },
  //     contentSecurityPolicy: {
  //       directives: {
  //         defaultSrc: ["'self'"],
  //         scriptSrc: [
  //           "'self'",
  //           `'nonce-${nonce}'`,
  //           "'strict-dynamic'",
  //           'https://jnn-pa.googleapis.com', // For Google APIs
  //           'https://apis.google.com', // General Google API scripts
  //           'https://s.ytimg.com', // For YouTube video player scripts
  //         ],
  //         styleSrc: [
  //           "'self'",
  //           `'nonce-${nonce}'`,
  //           'https://www.fontshmonts.com', // For custom fonts
  //           'https://fonts.googleapis.com', // For Google Fonts
  //         ],
  //         imgSrc: [
  //           "'self'",
  //           'data:',
  //           // "https://productionprymrstorage.s3.amazonaws.com", // For images stored in Google Cloud Storage
  //           'https://prymrstorage.s3.amazonaws.com',
  //           'https://d3tpm17xxr3efu.cloudfront.net',
  //           'blob:', // Allow blob URLs, required for Swagger UI
  //         ],
  //         fontSrc: [
  //           "'self'",
  //           'https://www.fontshmonts.com', // Custom font source
  //           'https://fonts.gstatic.com', // Google Fonts CDN
  //         ],
  //         objectSrc: ["'none'"],
  //         frameSrc: ["'self'"],
  //         mediaSrc: [
  //           "'self'",
  //           // "https://productionprymrstorage.s3.amazonaws.com" // If media is hosted in Google Cloud Storage
  //           'https://prymrstorage.s3.amazonaws.com',
  //           'https://d3tpm17xxr3efu.cloudfront.net',
  //         ],
  //         connectSrc: [
  //           "'self'",
  //           'https://jnn-pa.googleapis.com', // For specific Google APIs
  //         ],
  //         formAction: ["'self'"],
  //         frameAncestors: ["'self'"],
  //         scriptSrcAttr: [`'nonce-${nonce}'`], // Control scripts included via attributes
  //         styleSrcAttr: [`'nonce-${nonce}'`], // Control styles included via attributes
  //       },
  //     },
  //     frameguard: {
  //       action: 'deny',
  //     },
  //     xssFilter: true,
  //     referrerPolicy: {
  //       policy: 'strict-origin-when-cross-origin',
  //     },
  //   }),
  // );

  // app.use(
  //   (
  //     req: any,
  //     res: {
  //       setHeader: (arg0: string, arg1: string) => void;
  //       removeHeader: (arg0: string) => void;
  //     },
  //     next: () => void,
  //   ) => {
  //     res.setHeader('X-XSS-Protection', '1; mode=block');
  //     res.setHeader(
  //       'Permissions-Policy',
  //       `geolocation=(self), microphone=(), camera=(), fullscreen=(self), payment=()`,
  //     );
  //     res.removeHeader('Last-Modified');
  //     res.removeHeader('Date');
  //     res.removeHeader('ETag'); // Be cautious with this, as it can affect client-side caching
  //     next();
  //   },
  // );

  //--------------------------

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints[Object.keys(error.constraints)[0]],
        }));
        return new HttpException(
          {
            status: false,
            message: 'Validation failed',
            data: result,
          },
          HttpStatus.OK,
        );
      },
      stopAtFirstError: true,
    }),
  );
  // app.use(
  //   session({
  //     secret: "123hhu36diuahd__u7823g78q3poadfadfmyqwe8yr9qwer", // Replace with your own secret key
  //     resave: false,
  //     saveUninitialized: false,
  //   }),
  // );
  await app.listen(port);
  console.log('Server started at ', port);
}
bootstrap();
