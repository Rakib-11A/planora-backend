import { config } from './env';
import { logger } from '../lib/logger/logger';

export type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
};

export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to, subject, html } = params;

  if (!config.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set. Add it to .env.');
  }

  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': config.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: config.BREVO_SENDER_NAME, email: config.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('Brevo delivery failed', { to, subject, status: response.status, error: body });
    throw new Error(`Brevo API error ${response.status}: ${body}`);
  }

  if (config.NODE_ENV !== 'production') {
    const data = (await response.json()) as { messageId?: string };
    logger.debug('Email sent via Brevo', { to, subject, messageId: data.messageId });
  }
}
