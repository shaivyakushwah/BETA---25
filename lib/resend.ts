export interface SendEmailOptions {
  to: string;
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  ok: boolean;
  id?: string;
  error?: string;
}

export function resendAvailable(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function resendStatus(): { available: boolean; fromEmail: string } {
  return {
    available: resendAvailable(),
    fromEmail: process.env.RESEND_FROM_EMAIL || "Shortlist AI <onboarding@resend.dev>",
  };
}

/**
 * Sends an email using Resend's REST API.
 * Uses official API endpoint with zero extra package dependencies.
 */
export async function sendEmailWithResend(options: SendEmailOptions): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "RESEND_API_KEY is not configured. Add RESEND_API_KEY to your .env file to enable live email delivery.",
    };
  }

  const from = process.env.RESEND_FROM_EMAIL || "Shortlist AI <onboarding@resend.dev>";
  const htmlContent =
    options.html ||
    `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px;">
        <span style="font-size: 20px; font-weight: 800; color: #059669;">⚡ Shortlist AI</span>
      </div>
      <div style="white-space: pre-wrap; margin-bottom: 28px;">${options.body}</div>
      <div style="font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 14px;">
        Sent via Shortlist AI · 100% Human Confirmed Application Engine
      </div>
    </div>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [options.to],
        subject: options.subject,
        text: options.body,
        html: htmlContent,
        reply_to: options.replyTo,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errorJson = (await response.json().catch(() => ({}))) as { message?: string; name?: string };
      return {
        ok: false,
        error: errorJson.message || `Resend API returned HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as { id?: string };
    return {
      ok: true,
      id: data.id,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to connect to Resend API";
    return {
      ok: false,
      error: message,
    };
  }
}
