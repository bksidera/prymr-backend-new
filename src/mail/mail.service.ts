import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import Mailgun from 'mailgun.js';
import formData from 'form-data';
@Injectable()
export class MailService {
  private readonly mailgun;
  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    const domain = this.configService.get<string>('MAILGUN_DOMAIN');
    if (!apiKey || !domain) {
      throw new Error('Mailgun API key or domain is missing in configuration.');
    }
    this.mailgun = new Mailgun(formData).client({
      username: 'api',
      key: apiKey,
    });

    // this.sendEmail('kiran.mobilefirst@gmail.com', 'test', 'hellood testsee');
  }

//   async sendEmail(to: string, subject: string, text: string) {
//     try {
//       const response = await this.mailgun.messages.create(
//         this.configService.get<string>('MAILGUN_DOMAIN'),
//         {
//           from: 'ben@prymr.xyz', // Replace with a verified Mailgun sender
//           to,
//           subject,
//           text,
//         },
//       );
//       console.info(response);
//       return response;
//     } catch (error) {
//       console.info(error);
//       throw new Error(`Mailgun error: ${error}`);
//     }
//   }






  transporter = nodemailer.createTransport({
    host: `${this.configService.get('EMAIL_HOST')}`,
    port: 587, //this.configService.get('AWS_EMAIL_PORT'),
    from: `${this.configService.get('EMAIL_USER')}`,
    secure: false, // true for 465, false for other ports
    auth: {
      user: `${this.configService.get('EMAIL_USER')}`, // generated ethereal user
      pass: `${this.configService.get('EMAIL_PASS')}`, // generated ethereal password
    },
  });

  // from = `${this.configService.get('EMAIL_USER')}`
  from = 'prymrService@gmail.com';

  async sendMail(mailDetails: {
    fileName: string;
    userEmailList: string[];
    data: any;
    subject: string;
    text: string;
  }) {
    try {
      const baseDir = process.cwd(); //it getting current dir path

      const templatePath = path.join(
        baseDir,
        'src',
        'mail',
        'View',
        `${mailDetails.fileName}`,
      );

      const template = await ejs.renderFile(templatePath, mailDetails.data);
      const html = ejs.render(template.toString(), mailDetails.data);

      const userEmails = mailDetails.userEmailList;

    //   const info = await this.transporter.sendMail({
    //     from: this.from,
    //     to: userEmails.join(', '),
    //     subject: mailDetails.subject,
    //     html,
    //   });

      const response = await this.mailgun.messages.create(
        this.configService.get<string>('MAILGUN_DOMAIN'),
        {
          from: 'support@prymr.xyz ', // Replace with a verified Mailgun sender
          to:userEmails.join(', '),
          subject:mailDetails.subject,
          html,
        },
      );
      
      if(response.status==200){
          return 'Mail send successfully,if not receive in inbox please check in junk folder';
      }else{
        return 'Mail not send something is an wrong';
      }
    } catch (error) {
      return error.toString();
    }
  }
}

// generateEmail = async (mailDetails: {
//     to: any;
//     from?: any;
//     subject: any;
//     htmlContent: any
//     cc?: any
//     bcc?: any
//     attachments?: any
// }) => {
//     const transport = nodemailer.createTransport({
//         host: this.configService.get('EMAIL_HOST'),
//         port: 587,
//         secure: false,
//         auth: {
//             user: this.configService.get('EMAIL_USER'),
//             pass: this.configService.get('EMAIL_PASS'),
//         },
//     });

//     const email = transport.sendMail({
//         from: mailDetails.from ?? this.configService.get('EMAIL_USER'),
//         to: mailDetails.to,
//         cc: mailDetails.cc,
//         bcc: mailDetails.bcc,
//         subject: mailDetails.subject,
//         html: mailDetails.htmlContent,
//         attachments: mailDetails.attachments,
//         encoding: 'utf-8'
//     });
//     return email;
// };
