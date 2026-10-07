import nodemailer from 'nodemailer';
import type { Environment } from '../config.js';

export async function sendGmail(
  environment: Environment,
  sendHttp: typeof fetch,
  email: string,
  subject: string,
  text: string,
) {
  try {
    // Send-only OAuth authorization; no inbox-reading permission is needed.
    const authorization = await sendHttp(
      'https://oauth2.googleapis.com/token',
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        body: new URLSearchParams({
          client_id: environment.GMAIL_CLIENT_ID,
          client_secret: environment.GMAIL_CLIENT_SECRET,
          refresh_token: environment.GMAIL_REFRESH_TOKEN,
          grant_type: 'refresh_token',
        }),
      },
    );
    if (!authorization.ok) throw new Error('Email delivery failed.');
    const credentials: unknown = await authorization.json();
    if (
      !credentials ||
      typeof credentials !== 'object' ||
      !('access_token' in credentials) ||
      typeof credentials.access_token !== 'string' ||
      !credentials.access_token
    )
      throw new Error('Email delivery failed.');
    // Existing MIME library handles Unicode and header escaping safely.
    const composer = nodemailer.createTransport({
      streamTransport: true,
      buffer: true,
    });
    const message = await composer.sendMail({
      from: environment.MAIL_FROM,
      to: email,
      subject,
      text,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    if (!Buffer.isBuffer(message.message))
      throw new Error('Email delivery failed.');
    const response = await sendHttp(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: {
          Authorization: `Bearer ${credentials.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: Buffer.from(message.message).toString('base64url'),
        }),
      },
    );
    if (!response.ok) throw new Error('Email delivery failed.');
    const receipt: unknown = await response.json();
    if (
      !receipt ||
      typeof receipt !== 'object' ||
      !('id' in receipt) ||
      typeof receipt.id !== 'string' ||
      !receipt.id
    )
      throw new Error('Email delivery failed.');
  } catch {
    throw new Error('Email delivery failed.');
  }
}
