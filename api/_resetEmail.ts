/**
 * The password reset email. HTML for every modern client, with the link only
 * behind the button; a plain-text part for clients that cannot show HTML,
 * where the address has to be written out.
 */
const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const RESET_SUBJECT = 'Reset your FocusForge password';

export function resetEmailHtml(email: string, link: string) {
  const address = escapeHtml(email);
  const href = escapeHtml(link);
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${RESET_SUBJECT}</title></head>
<body style="margin:0;padding:0;background:#eef1f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef1f3;padding:32px 12px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e1dc;border-radius:20px;">
      <tr><td style="padding:36px 36px 8px 36px;">
        <img src="https://focusforgeorg.vercel.app/images/focusforge-icon.png" width="44" height="44" alt="FocusForge" style="display:block;border:0;border-radius:11px;">
      </td></tr>
      <tr><td style="padding:20px 36px 0 36px;">
        <h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:#1c1a17;">Reset your password</h1>
      </td></tr>
      <tr><td style="padding:12px 36px 0 36px;font-size:16px;line-height:1.6;color:#3f3c36;">
        We got a request to reset the password for your FocusForge account, <strong style="color:#1c1a17;">${address}</strong>.
      </td></tr>
      <tr><td style="padding:28px 36px 0 36px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="#1c1a17" style="border-radius:999px;">
            <a href="${href}" target="_blank" style="display:inline-block;padding:15px 34px;font-size:16px;font-weight:600;line-height:1;color:#ffffff;text-decoration:none;border-radius:999px;">Reset password</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:28px 36px 0 36px;font-size:15px;line-height:1.6;color:#5c5a55;">
        The button works once and expires in an hour. If it has expired, open FocusForge, tap <strong>Sign in with email</strong>, then <strong>Forgot password?</strong> to get a new one.
      </td></tr>
      <tr><td style="padding:20px 36px 36px 36px;">
        <p style="margin:0;padding-top:20px;border-top:1px solid #e2e1dc;font-size:14px;line-height:1.6;color:#5c5a55;">Didn’t ask for this? Ignore this email. Your password stays the same unless this button is used.</p>
      </td></tr>
    </table>
    <p style="margin:20px 0 0 0;font-size:13px;line-height:1.6;color:#6b6963;">Questions? Reply to this email or write to <a href="mailto:focusforgehelp@gmail.com" style="color:#6b6963;">focusforgehelp@gmail.com</a></p>
  </td></tr>
</table>
</body></html>`;
}

export function resetEmailText(email: string, link: string) {
  return [
    'Reset your password',
    '',
    `We got a request to reset the password for your FocusForge account, ${email}.`,
    '',
    `Choose a new password: ${link}`,
    '',
    'The link works once and expires in an hour. Didn’t ask for this? Ignore this email. Your password stays the same.',
    '',
    'FocusForge · focusforgehelp@gmail.com',
  ].join('\n');
}
