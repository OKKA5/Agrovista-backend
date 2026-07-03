import { Injectable } from "@nestjs/common";
import sgMail from "@sendgrid/mail";

@Injectable()
export class MailService {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY!);
  }

  async sendVerificationCode(email: string, code: string, message: string) {
    try {
      await sgMail.send({
        to: email,
        from: process.env.EMAIL_USER!,
        subject: `Verification Code ${message}`,
        text: `Your verification code is: ${code}`,
      });
    } catch (error) {
      console.error("Error sending email:", error);
      throw new Error("Could not send verification email.");
    }
  }
}
