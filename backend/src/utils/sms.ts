import env from "../config/env.js";
import { logger } from "./logger.js";

export const isSmsConfigured = () => Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);

// Twilio's REST API is called directly: one request does not justify pulling in the SDK
export const sendSms = async (to: string, body: string) => {
    if (!isSmsConfigured()) {
        // env validation makes Twilio mandatory in production, so this only happens in development.
        // The body is printed so codes in it can be used locally without an SMS provider.
        logger.warn("SMS provider is not configured, message not sent", { body });
        return;
    }
    const credentials = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: env.TWILIO_FROM_NUMBER ?? "", Body: body }),
        signal: AbortSignal.timeout(10 * 1000),
    });
    if (!response.ok) {
        throw new Error(`SMS provider responded with status ${response.status}`);
    }
};
