import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
@Injectable()
export class MailService {
  private transporter;

  constructor() {

    this.transporter = nodemailer.createTransport({
      pool: true,
      service: 'gmail', 
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS?.replace(/\s/g, ''),
      },
    });
  }

  async sendVerificationCode(email: string, code: string, message: string) {
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: `Verification Code ${message}`,
        text: `Your verification code is: ${code}`,
      });
    } catch (error) {
      console.error('Error sending email:', error);
      throw new Error('Could not send verification email.');
    }
  }
}