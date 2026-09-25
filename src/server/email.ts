import "server-only";

// Sends emails with Resend (https://resend.com) through its REST API.
// Needs RESEND_API_KEY and EMAIL_FROM, e.g. "Nadir <avisos@aleixaj.com>".

interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(email: Email): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Nadir <avisos@aleixaj.com>";

  if (!key) {
    // Local development without a key: print the email so links can still be tested.
    // Never in production, the text can contain login links.
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n[email] To: ${email.to}\n[email] Subject: ${email.subject}\n${email.text}\n`);
    } else {
      console.error("RESEND_API_KEY is missing, email not sent:", email.subject);
    }
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: email.to, subject: email.subject, html: email.html, text: email.text }),
    });
    if (!res.ok) {
      console.error("Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Could not reach Resend", err);
    return false;
  }
}
