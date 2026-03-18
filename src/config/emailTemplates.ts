
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safeCtaHref(url: string): string {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return "https://planora.app";
    }
    return u.href;
  } catch {
    return "https://planora.app";
  }
}

const brandColor = "#0f766e";
const brandMuted = "#64748b";
const pageBg = "#f1f5f9";

function shell(inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Planora</title>
</head>
<body style="margin:0;padding:0;background-color:${pageBg};font-family:Georgia,'Times New Roman',serif;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${pageBg};padding:24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
          ${inner}
        </table>
        <p style="margin:20px 0 0;font-size:12px;color:${brandMuted};font-family:system-ui,sans-serif;">© Planora</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// OTP email for email verification or password reset.

export function otpEmailTemplate(
  otp: string,
  type: "verification" | "reset",
): string {
  const safeOtp = escapeHtml(otp);
  const title =
    type === "verification"
      ? "Verify your email"
      : "Reset your password";
  const subtitle =
    type === "verification"
      ? "Use this code to confirm your email address."
      : "Use this code to set a new password.";

  const inner = `
          <tr>
            <td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${brandColor};font-weight:600;">Planora</p>
              <h1 style="margin:12px 0 0;font-size:22px;line-height:1.25;color:#0f172a;">${title}</h1>
              <p style="margin:12px 0 0;font-size:15px;line-height:1.5;color:#334155;">${subtitle}</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 28px;">
              <div style="display:inline-block;padding:20px 36px;background-color:#f8fafc;border:2px dashed ${brandColor};border-radius:10px;">
                <span style="font-size:32px;font-weight:700;letter-spacing:0.35em;font-family:ui-monospace,monospace;color:#0f172a;">${safeOtp}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 16px;font-family:system-ui,sans-serif;">
              <p style="margin:0;font-size:14px;color:${brandMuted};text-align:center;">Expires in <strong style="color:#334155;">10 minutes</strong>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-family:system-ui,sans-serif;">
              <p style="margin:0;padding:14px 16px;background-color:#fff7ed;border-left:4px solid #ea580c;font-size:13px;line-height:1.5;color:#9a3412;border-radius:0 8px 8px 0;">
                If you did not request this code, ignore this email. Do not share this code with anyone.
              </p>
            </td>
          </tr>`;

  return shell(inner);
}

// Post-signup welcome. Pass the same URL you use for the app (e.g. FRONTEND_URL).

export function welcomeEmailTemplate(
  name: string,
  ctaHref: string = "https://planora.app",
): string {
  const safeName = escapeHtml(name.trim() || "there");
  const href = safeCtaHref(ctaHref);
  const inner = `
          <tr>
            <td style="padding:28px 28px 8px;font-family:system-ui,-apple-system,sans-serif;">
              <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${brandColor};font-weight:600;">Planora</p>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.2;color:#0f172a;">Welcome, ${safeName}!</h1>
              <p style="margin:14px 0 0;font-size:15px;line-height:1.55;color:#334155;">
                You’re set to discover events, join communities, and stay organized — all in one place.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 20px;font-family:system-ui,sans-serif;">
              <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#0f172a;">What you can do</p>
              <ul style="margin:0;padding:0 0 0 18px;color:#475569;font-size:14px;line-height:1.65;">
                <li style="margin-bottom:6px;">Browse and register for public and private events</li>
                <li style="margin-bottom:6px;">Invite guests and manage your own events</li>
                <li>Track payments and share feedback after events</li>
              </ul>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 28px 32px;">
              <a href="${href}" style="display:inline-block;padding:14px 28px;background-color:${brandColor};color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:8px;font-family:system-ui,sans-serif;">Go to Planora</a>
            </td>
          </tr>`;

  return shell(inner);
}
