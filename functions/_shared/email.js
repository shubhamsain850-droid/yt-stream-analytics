/**
 * TubeMetrix Automated Email Delivery Engine
 * Handles welcome onboarding emails and transactional creator notifications
 * Supports Resend, Brevo, MailChannels, and custom webhook dispatchers.
 */

import { hasEmailBeenSent, recordSentEmail } from './db.js';

/**
 * Builds responsive, creator-focused HTML welcome email for new signups.
 */
export function buildWelcomeEmailHtml({ name, givenName, email }) {
  const safeName = (givenName || name || 'Creator').trim();
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Welcome to TubeMetrix!</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0b0f19; width: 100%;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <!-- Container -->
        <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background: linear-gradient(180deg, #131b2e 0%, #0f172a 100%); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 36px 24px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); background: radial-gradient(circle at 100% 0%, rgba(220, 38, 38, 0.18) 0%, transparent 60%);">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <img src="https://tubemetrix.net/icon-192.png" width="40" height="40" alt="TubeMetrix Logo" style="display: block; border-radius: 10px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35);" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 14px;">
                    <span style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">Tube<span style="color: #ef4444;">Metrix</span></span>
                    <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 600; margin-top: 2px;">Creator Analytics & Live Super Chat Intelligence</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Welcome Message -->
          <tr>
            <td style="padding: 32px 36px 20px;">
              <h1 style="margin: 0 0 16px; font-size: 24px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                Welcome to TubeMetrix, ${safeName}! 🎉
              </h1>
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                Thank you for joining TubeMetrix. Your creator account has been successfully created. You now have instant access to real-time YouTube live stream analytics, Super Chat & Membership tracking, YouTube Jewels intelligence, and full live chat message replay.
              </p>
            </td>
          </tr>

          <!-- Perks / Feature Cards -->
          <tr>
            <td style="padding: 0 36px 24px;">
              <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                
                <!-- Card 1: 3 Free Weekly Runs -->
                <tr>
                  <td style="padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px; margin-bottom: 12px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 22px; vertical-align: top; padding-right: 14px; line-height: 1;">🎁</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 15px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">3 Free Single-Stream Audits Every Week</div>
                          <div style="font-size: 13px; line-height: 1.5; color: #94a3b8;">
                            Audit any live stream replay or premier with full Super Chat, Membership, and Jewels gift breakdowns. Recharges automatically every Monday.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr><td height="12"></td></tr>

                <!-- Card 2: Flat 1 Credit Model -->
                <tr>
                  <td style="padding: 16px; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 12px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 22px; vertical-align: top; padding-right: 14px; line-height: 1;">⚡</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 15px; font-weight: 700; color: #fca5a5; margin-bottom: 4px;">Flat 1 Credit = 1 Full Stream (Zero Volume Penalties)</div>
                          <div style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">
                            Audit whole channels or download massive 500,000+ live chat transcripts. 1 credit unlocks 100% of messages and revenue for that entire stream—no chat volume cuts or surprises.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr><td height="12"></td></tr>

                <!-- Card 3: Jewels & Rubies -->
                <tr>
                  <td style="padding: 16px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 12px;">
                    <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 22px; vertical-align: top; padding-right: 14px; line-height: 1;">💎</td>
                        <td style="vertical-align: top;">
                          <div style="font-size: 15px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">YouTube Jewels & Rubies Gifts Intelligence</div>
                          <div style="font-size: 13px; line-height: 1.5; color: #94a3b8;">
                            Track modern creator gifts, sticker animations, and multi-currency supporter leaderboards in 30+ regional currencies including INR, USD, EUR, and JPY.
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Primary Call to Action -->
          <tr>
            <td style="padding: 8px 36px 36px; text-align: center;">
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); box-shadow: 0 6px 20px rgba(220, 38, 38, 0.4);">
                    <a href="https://tubemetrix.net" target="_blank" style="display: inline-block; padding: 15px 36px; font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px; letter-spacing: 0.2px;">
                      Launch TubeMetrix Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <div style="font-size: 12px; color: #64748b; margin-top: 14px;">
                No setup required &bull; Works seamlessly on desktop and mobile browsers
              </div>
            </td>
          </tr>

          <!-- Quick Navigation Links -->
          <tr>
            <td style="padding: 20px 36px; background: rgba(0, 0, 0, 0.2); border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 12px;">Quick Creator Tools</div>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding: 0 10px;">
                    <a href="https://tubemetrix.net/" target="_blank" style="font-size: 13px; color: #93c5fd; text-decoration: none; font-weight: 500;">📊 Stream Earnings</a>
                  </td>
                  <td style="color: #475569;">&bull;</td>
                  <td style="padding: 0 10px;">
                    <a href="https://tubemetrix.net/chats" target="_blank" style="font-size: 13px; color: #93c5fd; text-decoration: none; font-weight: 500;">💬 Chat Replay & Comments</a>
                  </td>
                  <td style="color: #475569;">&bull;</td>
                  <td style="padding: 0 10px;">
                    <a href="https://tubemetrix.net/jewels" target="_blank" style="font-size: 13px; color: #93c5fd; text-decoration: none; font-weight: 500;">💎 Jewels & Gifts</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 36px; text-align: center; font-size: 12px; line-height: 1.6; color: #64748b; border-top: 1px solid rgba(255, 255, 255, 0.04);">
              <p style="margin: 0 0 6px;">
                Have questions or need creator help? Simply reply directly to this email or reach us at <a href="mailto:support@tubemetrix.net" style="color: #94a3b8; text-decoration: underline;">support@tubemetrix.net</a>.
              </p>
              <p style="margin: 0; color: #475569;">
                &copy; ${year} TubeMetrix. Built with passion for live streamers and video creators worldwide.
              </p>
            </td>
          </tr>

        </table>
        <!-- End Container -->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Builds plain-text fallback version of welcome email.
 */
export function buildWelcomeEmailText({ name, givenName, email }) {
  const safeName = (givenName || name || 'Creator').trim();
  return `Welcome to TubeMetrix, ${safeName}! 🎉

Thank you for joining TubeMetrix. Your creator account is now active and ready.

What you get right away:
- 🎁 3 Free Single Stream Audits Every Week: Audit any live stream replay or premier with full Super Chat, Membership, and Jewels gift breakdowns.
- ⚡ Flat 1 Credit = 1 Full Stream: Audit full channel archives or export massive chat transcripts with zero volume penalties. 1 credit unlocks the complete stream.
- 💎 YouTube Jewels & Rubies Gifts: Track modern viewer gifts across 30+ regional currencies (INR, USD, EUR, etc.).
- 📊 Instant Data Exports: Clean CSV & JSON files ready for accounting, leaderboards, or sponsor reports.

Start analyzing right now at:
https://tubemetrix.net

Need help or have questions? Just reply directly to this email!

Best regards,
The TubeMetrix Team
https://tubemetrix.net
`;
}

/**
 * Sends a transactional email via available provider:
 * 1. Resend API (if env.RESEND_API_KEY is configured)
 * 2. Brevo API (if env.BREVO_API_KEY is configured)
 * 3. MailChannels API (Cloudflare native fallback)
 * 4. Webhook URL (if env.EMAIL_WEBHOOK_URL is configured)
 */
export async function sendTransactionalEmail(env, { to, toName, subject, html, text }) {
  const fromEmail = env?.EMAIL_FROM || 'TubeMetrix <onboarding@resend.dev>';
  const fromAddressOnly = env?.EMAIL_FROM_ADDRESS || 'welcome@tubemetrix.net';

  // 1. Resend API
  if (env?.RESEND_API_KEY) {
    try {
      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: subject,
          html: html,
          text: text,
        }),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        return { success: true, provider: 'resend', id: data?.id };
      }
      const errText = await resp.text().catch(() => '');
      console.warn(`[Email Resend HTTP ${resp.status}]:`, errText);
    } catch (err) {
      console.error('[Email Resend Error]:', err);
    }
  }

  // 2. Brevo API
  if (env?.BREVO_API_KEY) {
    try {
      const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': env.BREVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'TubeMetrix', email: fromAddressOnly },
          to: [{ email: to, name: toName || to.split('@')[0] }],
          subject: subject,
          htmlContent: html,
          textContent: text,
        }),
      });

      if (resp.ok) {
        const data = await resp.json().catch(() => ({}));
        return { success: true, provider: 'brevo', id: data?.messageId };
      }
      const errText = await resp.text().catch(() => '');
      console.warn(`[Email Brevo HTTP ${resp.status}]:`, errText);
    } catch (err) {
      console.error('[Email Brevo Error]:', err);
    }
  }

  // 3. Webhook Relay
  if (env?.EMAIL_WEBHOOK_URL) {
    try {
      const resp = await fetch(env.EMAIL_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, toName, subject, html, text, from: fromEmail }),
      });
      if (resp.ok) {
        return { success: true, provider: 'webhook' };
      }
    } catch (err) {
      console.error('[Email Webhook Error]:', err);
    }
  }

  // 4. MailChannels (Cloudflare Workers native transactional service)
  if (env?.ENABLE_MAILCHANNELS === 'true') {
    try {
      const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to, name: toName || to.split('@')[0] }] }],
          from: { email: fromAddressOnly, name: 'TubeMetrix' },
          subject: subject,
          content: [
            { type: 'text/plain', value: text },
            { type: 'text/html', value: html },
          ],
        }),
      });

      if (resp.ok) {
        return { success: true, provider: 'mailchannels' };
      }
      const errText = await resp.text().catch(() => '');
      console.warn(`[Email MailChannels HTTP ${resp.status}]:`, errText);
    } catch (err) {
      console.error('[Email MailChannels Error]:', err);
    }
  }

  // 5. Fallback logging (no active provider key configured yet)
  console.log(`[Welcome Email Logged]: Ready for ${to} (${subject}). Configure RESEND_API_KEY in Cloudflare settings to deliver automatically.`);
  return { success: false, provider: 'logged', reason: 'No email API key configured' };
}

/**
 * Checks if user is new and sends welcome onboarding email once.
 */
export async function sendWelcomeEmailIfNew(db, env, user) {
  if (!user || !user.id || !user.email) {
    return { skipped: true, reason: 'Invalid user object' };
  }

  // Idempotency check: has this user already received a welcome email?
  const alreadySent = await hasEmailBeenSent(db, user.id, 'welcome');
  if (alreadySent) {
    return { skipped: true, reason: 'Already sent previously' };
  }

  const subject = `Welcome to TubeMetrix, ${user.givenName || 'Creator'}! 🚀 Your Account is Ready`;
  const html = buildWelcomeEmailHtml(user);
  const text = buildWelcomeEmailText(user);

  const result = await sendTransactionalEmail(env, {
    to: user.email,
    toName: user.name || user.givenName,
    subject,
    html,
    text,
  });

  // Record audit log in D1
  await recordSentEmail(db, {
    userId: user.id,
    email: user.email,
    template: 'welcome',
    provider: result.provider || 'unknown',
    status: result.success ? 'delivered' : 'pending_config',
  });

  return result;
}
