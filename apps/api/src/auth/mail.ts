import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';
import type { Environment } from '../config.js';
import { sendGmail } from './gmail.js';

const messages = {
  en: {
    verify: 'Verify your email',
    reset: 'Reset your password',
    help: 'Open the link below. If you did not request this, ignore this email.',
  },
  ht: {
    verify: 'Verifye adrès imèl ou',
    reset: 'Reyinisyalize modpas ou',
    help: 'Louvri lyen ki anba a. Si ou pa t mande sa, inyore imèl sa a.',
  },
  fr: {
    verify: 'Vérifiez votre adresse e-mail',
    reset: 'Réinitialisez votre mot de passe',
    help: 'Ouvrez le lien ci-dessous. Si vous n’avez pas fait cette demande, ignorez cet e-mail.',
  },
  es: {
    verify: 'Verifica tu correo electrónico',
    reset: 'Restablece tu contraseña',
    help: 'Abre el enlace de abajo. Si no lo solicitaste, ignora este correo.',
  },
};
export class IdentityMailer {
  private readonly transport;
  constructor(
    private readonly environment: Environment,
    private readonly sendHttp: typeof fetch = fetch,
  ) {
    this.transport = nodemailer.createTransport({
      host: environment.SMTP_HOST,
      port: environment.SMTP_PORT,
      secure: environment.SMTP_PORT === 465,
      requireTLS: environment.APP_ENV === 'production',
      ...(environment.SMTP_USER
        ? {
            auth: {
              user: environment.SMTP_USER,
              pass: environment.SMTP_PASSWORD,
            },
          }
        : {}),
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
  }
  async send(
    email: string,
    locale: string,
    purpose: 'VERIFY_EMAIL' | 'RESET_PASSWORD',
    token: string,
  ) {
    const copy = messages[locale as keyof typeof messages] ?? messages.en;
    const route =
      purpose === 'VERIFY_EMAIL' ? 'verify-email' : 'reset-password';
    const subject = purpose === 'VERIFY_EMAIL' ? copy.verify : copy.reset;
    // Fragment avoids tokens in HTTP request URLs, access logs and Referer headers.
    const url = `${this.environment.PUBLIC_WEB_URL}/${route}#token=${token}`;
    if (this.environment.MAIL_TRANSPORT === 'gmail') {
      await sendGmail(
        this.environment,
        this.sendHttp,
        email,
        subject,
        `${subject}\n\n${copy.help}\n\n${url}`,
      );
      return;
    }
    if (this.environment.MAIL_TRANSPORT === 'resend') {
      try {
        const response = await this.sendHttp('https://api.resend.com/emails', {
          method: 'POST',
          redirect: 'error',
          signal: AbortSignal.timeout(10000),
          headers: {
            Authorization: `Bearer ${this.environment.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': createHash('sha256')
              .update(JSON.stringify([purpose, email, token]))
              .digest('hex'),
          },
          body: JSON.stringify({
            from: this.environment.MAIL_FROM,
            to: [email],
            subject,
            text: `${subject}\n\n${copy.help}\n\n${url}`,
          }),
        });
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
        // Provider bodies and network errors can include credentials or personal data.
        throw new Error('Email delivery failed.');
      }
      return;
    }
    await this.transport.sendMail({
      from: this.environment.MAIL_FROM,
      to: email,
      subject,
      text: `${subject}\n\n${copy.help}\n\n${url}`,
    });
  }
}
