import nodemailer, { type Transporter } from "nodemailer";
import env from "../config/env.js";
import { logger } from "./logger.js";

interface Mail {
    to: string;
    subject: string;
    text: string;
    html: string;
}

let transporter: Transporter | undefined;

// Plain SMTP keeps the provider swappable: SES, Resend, Postmark and Mailtrap all expose an SMTP endpoint
const getTransporter = (): Transporter => {
    transporter ??= nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        // 465 is implicit TLS; other ports upgrade with STARTTLS
        secure: env.SMTP_PORT === 465,
        auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
    return transporter;
};

export const isMailerConfigured = () => Boolean(env.SMTP_HOST && env.EMAIL_FROM);

export const sendMail = async (mail: Mail) => {
    if (!isMailerConfigured()) {
        // env validation makes SMTP mandatory in production, so this only happens in development.
        // The body is printed so links in it can be used locally without a mail server.
        logger.warn("SMTP is not configured, email not sent", { subject: mail.subject, text: mail.text });
        return;
    }
    await getTransporter().sendMail({ from: env.EMAIL_FROM, ...mail });
};
