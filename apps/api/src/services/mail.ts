import nodemailer, { type Transporter } from 'nodemailer';

import { env } from '../env.js';
import type { Enquiry } from '@printsbytee/shared';

/**
 * Failure-handling contract (issue #16 acceptance criterion):
 *
 *   - `sendEnquiryNotification(enquiry)` is **best-effort** and
 *     **never throws**. The HTTP route has already persisted the
 *     enquiry row by the time it calls this function, so the caller
 *     always returns 201 to the user regardless of mail outcome.
 *
 *   - If any required SMTP env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
 *     `SMTP_PASS`, `ENQUIRY_EMAIL`) is missing, the send is skipped
 *     with a warning log. This lets dev/test environments boot
 *     without SMTP configured, and protects against partial prod
 *     config from crashing the request.
 *
 *   - If the transport is misconfigured or the send times out, the
 *     error is caught and logged at `error` level. The enquiry is
 *     still durable in the DB; the operator can recover by inspecting
 *     the `enquiries` table.
 *
 *   - A 10-second send timeout is applied so a wedged SMTP server
 *     cannot hold the HTTP request open indefinitely. nodemailer
 *     respects this via the `socketTimeout` / `connectionTimeout`
 *     options on the transport.
 *
 * The function intentionally has no return value — callers await it
 * only to settle logs before responding, not to react to its outcome.
 */

const SEND_TIMEOUT_MS = 10_000;

type EnquiryForMail = Pick<
  Enquiry,
  'id' | 'name' | 'email' | 'productId' | 'message' | 'createdAt'
>;

/** Build the plain-text notification body sent to the operator inbox. */
function renderEnquiryBody(enquiry: EnquiryForMail): string {
  const lines = [
    `New enquiry from ${enquiry.name} <${enquiry.email}>`,
    '',
    `Submitted: ${enquiry.createdAt}`,
    `Enquiry ID: ${enquiry.id}`,
    `Product: ${enquiry.productId ?? '(general — no specific product)'}`,
    '',
    'Message:',
    '--------',
    enquiry.message,
  ];
  return lines.join('\n');
}

function isSmtpConfigured(): boolean {
  return Boolean(
    env.SMTP_HOST &&
      env.SMTP_PORT !== undefined &&
      env.SMTP_USER &&
      env.SMTP_PASS &&
      env.ENQUIRY_EMAIL,
  );
}

/**
 * Send a notification email for a newly-persisted enquiry.
 *
 * Never throws. See the JSDoc on this module for the full failure
 * contract.
 */
export async function sendEnquiryNotification(
  enquiry: EnquiryForMail,
): Promise<void> {
  if (!isSmtpConfigured()) {
    // eslint-disable-next-line no-console
    console.warn(
      '[mail] SMTP not fully configured (need SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ENQUIRY_EMAIL). Skipping enquiry notification.',
    );
    return;
  }

  // Non-null because isSmtpConfigured() returned true.
  const host = env.SMTP_HOST as string;
  const port = env.SMTP_PORT as number;
  const user = env.SMTP_USER as string;
  const pass = env.SMTP_PASS as string;
  const to = env.ENQUIRY_EMAIL as string;
  const from = env.SMTP_FROM ?? user;

  let transporter: Transporter;
  try {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      // Cap how long nodemailer will wait on a stuck socket so a
      // wedged SMTP server cannot hold the request open past the
      // route's response deadline.
      connectionTimeout: SEND_TIMEOUT_MS,
      socketTimeout: SEND_TIMEOUT_MS,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(
      { err, enquiryId: enquiry.id },
      '[mail] Failed to construct SMTP transport; enquiry notification skipped.',
    );
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to,
      replyTo: enquiry.email,
      subject: `New enquiry from ${enquiry.name}`,
      text: renderEnquiryBody(enquiry),
    });
    // eslint-disable-next-line no-console
    console.info(
      { enquiryId: enquiry.id, to },
      '[mail] Enquiry notification sent.',
    );
  } catch (err) {
    // Log loudly — the enquiry is durable in DB, but the operator
    // needs to know the notification didn't go out.
    // eslint-disable-next-line no-console
    console.error(
      { err, enquiryId: enquiry.id, to },
      '[mail] Failed to send enquiry notification; enquiry is still persisted in DB.',
    );
  }
}
