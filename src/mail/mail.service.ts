import { Injectable, Logger } from "@nestjs/common";
import Mailgun from "mailgun.js";
import formData from "form-data";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private mg;

  constructor() {
    const mailgun = new Mailgun(formData);
    this.mg = mailgun.client({
      username: "api",
      key: process.env.MAILGUN_API_KEY ?? "",
    });
  }

  async sendVerificationCode(email: string, code: string, message: string) {
    try {
      await this.mg.messages.create(process.env.MAILGUN_DOMAIN!, {
        from: process.env.EMAIL_USER!,
        to: [email],
        subject: `Verification Code ${message}`,
        text: `Your verification code is: ${code}`,
      });
    } catch (error) {
      this.logger.error("Mailgun error:", (error as any)?.response?.data || (error as Error)?.message || error);
      throw new Error("Could not send verification email.");
    }
  }
}
