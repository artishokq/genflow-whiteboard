export {};

import nodemailer from "nodemailer";

class MailService {
  transporter: any;

  constructor() {
    const smtpPort = Number(process.env.SMTP_PORT ?? 587);

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }

  async sendActivationMail(to: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: "Activation code for GenFlow Whiteboard",
      text: `Your activation code is ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>GenFlow Whiteboard</h2>
          <p>Your activation code:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
          <p>The code is valid for 15 minutes.</p>
        </div>
      `,
    });
  }

  async sendEmailChangeCodeMail(to: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: "Email change code for GenFlow Whiteboard",
      text: `Your email change code is ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>GenFlow Whiteboard</h2>
          <p>Your email change code:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
          <p>The code is valid for 15 minutes.</p>
        </div>
      `,
    });
  }

  async sendPasswordResetCodeMail(to: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: "Password reset code for GenFlow Whiteboard",
      text: `Your password reset code is ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>GenFlow Whiteboard</h2>
          <p>Your password reset code:</p>
          <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p>
          <p>The code is valid for 15 minutes.</p>
        </div>
      `,
    });
  }
}

const mailService = new MailService();

export default mailService;
