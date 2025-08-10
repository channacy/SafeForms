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
      body {{ margin:0; padding:0; background:#f7f7f7; }}
      .container {{ max-width:640px; margin:0 auto; background:#ffffff; padding:24px; font-family:system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color:#1f2937; }}
      .h1 {{ font-size:18px; font-weight:700; margin:0 0 12px; }}
      .muted {{ color:#6b7280; font-size:12px; }}
      .list li {{ margin:4px 0; }}
      a {{ color:#2563eb; text-decoration:none; }}
    </style>
  </head>
  <body>
    <div class=\"container\">
      <div class=\"h1\">{title}</div>
      <div>{body_html}</div>
      {f'<div class=\"muted\" style=\"margin-top:16px\">{footer_html}</div>' if footer_html else ''}
    </div>
  </body>
</html>"""
