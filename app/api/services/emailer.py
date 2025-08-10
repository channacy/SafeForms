import os
import smtplib
from typing import Dict, List, Optional
from email.message import EmailMessage


class Emailer:
    """Simple SMTP email sender configured via environment variables.

    Required env vars:
      - SMTP_HOST
      - SMTP_PORT (int)
      - SMTP_USER
      - SMTP_PASS
      - FROM_EMAIL

    Optional env vars:
      - PROGRESS_RECIPIENTS (comma-separated)
      - COMPLETION_RECIPIENTS (comma-separated)
    """

    def __init__(self) -> None:
        self.smtp_host = os.getenv("SMTP_HOST", "")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587") or 587)
        self.smtp_user = os.getenv("SMTP_USER", "")
        self.smtp_pass = os.getenv("SMTP_PASS", "")
        self.from_email = os.getenv("FROM_EMAIL", "")
        if not (self.smtp_host and self.smtp_user and self.smtp_pass and self.from_email):
            # We allow instantiation even if config incomplete; send() will raise.
            pass

    @staticmethod
    def _parse_recipients(value: Optional[str]) -> List[str]:
        return [x.strip() for x in (value or "").split(",") if x.strip()]

    def get_default_progress_recipients(self) -> List[str]:
        return self._parse_recipients(os.getenv("PROGRESS_RECIPIENTS"))

    def get_default_completion_recipients(self) -> List[str]:
        return self._parse_recipients(os.getenv("COMPLETION_RECIPIENTS"))

    def send(
        self,
        subject: str,
        body_text: str,
        to: Optional[List[str]] = None,
        body_html: Optional[str] = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        if not (self.smtp_host and self.smtp_user and self.smtp_pass and self.from_email):
            raise RuntimeError("SMTP not configured. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL in .env")
        recipients = to or []
        if not recipients:
            raise ValueError("No recipients provided for email")

        msg = EmailMessage()
        msg["From"] = self.from_email
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = subject
        if body_html:
            msg.set_content(body_text)
            msg.add_alternative(body_html, subtype="html")
        else:
            msg.set_content(body_text)

        # Optional additional headers (e.g., List-Unsubscribe)
        for k, v in (headers or {}).items():
            if v:
                msg[k] = v

        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg)


def render_basic_html(title: str, body_html: str, footer_html: Optional[str] = None) -> str:
    """Very simple, inline-safe HTML email wrapper."""
    return f"""<!doctype html>
<html>
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"x-apple-disable-message-reformatting\">
    <meta name=\"color-scheme\" content=\"light dark\">
    <meta name=\"supported-color-schemes\" content=\"light dark\">
    <style>
      /* Layout */
      body {{ margin:0; padding:0; background:#f0fdf4; }} /* green-50 */
      .wrapper {{ padding:24px 12px; }}
      .container {{ max-width:720px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; box-shadow:0 10px 20px rgba(16,185,129,0.08); font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#111827; }}
      .header {{ padding:20px 24px 12px; border-bottom:1px solid #f3f4f6; }}
      .title {{ font-size:20px; line-height:1.2; font-weight:800; margin:0; color:#065f46; }} /* green-900 */
      .badge-row {{ display:flex; gap:8px; flex-wrap:wrap; margin:8px 0; }}
      .content {{ padding:20px 24px; font-size:15px; line-height:1.6; }}
      .footer {{ padding:12px 24px 20px; border-top:1px solid #f3f4f6; color:#6b7280; font-size:12px; }}

      /* Badges */
      .badge {{ display:inline-block; padding:4px 10px; border-radius:999px; font-weight:700; border:1px solid transparent; }}
      .badge-success {{ background:#dcfce7; color:#166534; border-color:#86efac; }} /* green */
      .badge-warn {{ background:#ffedd5; color:#7c2d12; border-color:#fdba74; }} /* amber */
      .badge-danger {{ background:#fee2e2; color:#991b1b; border-color:#fca5a5; }} /* red */

      /* Buttons */
      .btn {{ display:inline-block; padding:10px 14px; border-radius:10px; background:#10b981; color:#ffffff !important; text-decoration:none; font-weight:700; border:1px solid #0ea5a7; box-shadow:0 1px 2px rgba(0,0,0,0.05); }}
      .btn:hover {{ background:#059669; }}
      .btn:active {{ background:#047857; }}

      /* Links */
      a.link {{ color:#047857; text-decoration:underline; }}
    </style>
  </head>
  <body>
    <div class=\"wrapper\">
      <div class=\"container\">
        <div class=\"header\">
          <h1 class=\"title\">{title}</h1>
        </div>
        <div class=\"content\">{body_html}</div>
        {f'<div class=\"footer\">{footer_html}</div>' if footer_html else ''}
      </div>
    </div>
  </body>
</html>"""
