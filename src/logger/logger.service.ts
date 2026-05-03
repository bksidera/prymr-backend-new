import { Injectable } from '@nestjs/common';
// import { createLogger, transports, format } from 'winston';
// import * as DailyRotateFile from 'winston-daily-rotate-file';
// import { join } from 'path';

@Injectable()
export class LoggerService {
    // private logger;

    // constructor() {
    //     const fileRotateTransport = new DailyRotateFile({
    //         filename: join(
    //             __dirname,
    //             `../../logs/${process.env.NODE_ENV || 'development'}/%DATE%.txt`,
    //         ),
    //         datePattern: 'YYYY-MM-DD',
    //         // maxFiles: '14d',
    //     });

    //     this.logger = createLogger({
    //         level: 'debug',
    //         format: format.combine(
    //             format.label({ label: 'Log Rotation' }),
    //             format.timestamp({ format: 'MMM-DD-YYYY HH:mm:ss' }),
    //             format.printf(({ level, message, label, timestamp }) => `${timestamp} [${label}] ${level}: ${message}`),
    //         ),
    //         transports: [fileRotateTransport, new transports.Console()],
    //     });

    //     if (process.env.NODE_ENV !== 'production') {
    //         this.logger.add(
    //             new transports.Console({
    //                 format: format.simple(),
    //             }),
    //         );
    //     }
    // }

    // getLogger() {
    //     return this.logger;
    // }
}
