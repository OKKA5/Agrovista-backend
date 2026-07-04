import { Injectable, Logger } from "@nestjs/common";
import sgMail from "@sendgrid/mail";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      this.logger.error("SENDGRID_API_KEY is not set");
    }
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
    } catch (error: any) {
      this.logger.error("SendGrid error:", error?.response?.body || error);
      throw new Error("Could not send verification email.");
    }
  }
}
