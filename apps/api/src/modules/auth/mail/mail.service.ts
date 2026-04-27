export {};

import { Resend } from "resend";

class MailService {
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is required");
    }
    this.resend = new Resend(apiKey);
    this.from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  }

  private async sendCodeMail(args: {
    to: string;
    subject: string;
    label: string;
    code: string;
  }) {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: args.to,
      subject: args.subject,
      text: `${args.label}: ${args.code}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>GenFlow Whiteboard</h2>
          <p>${args.label}:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${args.code}</p>
          <p>The code is valid for 15 minutes.</p>
        </div>
      `,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendActivationMail(to: string, code: string) {
    await this.sendCodeMail({
      to,
      code,
      subject: "Activation code for GenFlow Whiteboard",
      label: "Your activation code",
    });
  }

  async sendEmailChangeCodeMail(to: string, code: string) {
    await this.sendCodeMail({
      to,
      code,
      subject: "Email change code for GenFlow Whiteboard",
      label: "Your email change code",
    });
  }

  async sendPasswordResetCodeMail(to: string, code: string) {
    await this.sendCodeMail({
      to,
      code,
      subject: "Password reset code for GenFlow Whiteboard",
      label: "Your password reset code",
    });
  }
}

const mailService = new MailService();

export default mailService;
