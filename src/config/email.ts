import nodemailer from "nodemailer";

import { config, isSmtpSecure } from "./env";

const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: isSmtpSecure(),
  auth: {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  },
});

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, html } = params;
  try {
    const info = await transporter.sendMail({
      from: config.SMTP_FROM,
      to,
      subject,
      html,
    });
    if (config.NODE_ENV === "development") {
      console.log("[email] Sent:", { to, subject, messageId: info.messageId });
    }
  } catch (err) {
    if (config.NODE_ENV === "development") {
      console.error("[email] Send failed:", err);
    }
    throw err;
  }
}

export default transporter;
