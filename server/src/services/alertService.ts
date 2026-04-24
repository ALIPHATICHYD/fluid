import nodemailer from "nodemailer";

let lastAlertTime: Record<string, number> = {};

export function resetCooldown(accountId: string) {
  delete lastAlertTime[accountId];
}

export async function sendLowBalanceAlert({
  accountId,
  currentBalance,
  threshold,
  network,
}: {
  accountId: string;
  currentBalance: number;
  threshold: number;
  network: string;
}) {
  const now = Date.now();
  const cooldown = parseInt(process.env.FLUID_LOW_BALANCE_ALERT_COOLDOWN_MS || "0");

  if (lastAlertTime[accountId] && now - lastAlertTime[accountId] < cooldown) {
    return { slackSent: false, emailSent: false, errors: [] };
  }

  lastAlertTime[accountId] = now;

  const errors: string[] = [];
  let emailSent = false;
  let slackSent = false;

  // ✅ EMAIL (SMTP)
  if (process.env.SMTP_HOST) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: process.env.EMAIL_TO,
        subject: "⚠️ Low Balance Alert",
        text: `Account ${accountId} is low on balance.
Current: ${currentBalance} XLM
Threshold: ${threshold} XLM
Network: ${network}`,
      });

      emailSent = true;
    } catch (err: any) {
      errors.push("Email failed: " + err.message);
    }
  }

  // ✅ SLACK (optional)
  if (process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `⚠️ Low Balance Alert\nAccount: ${accountId}\nBalance: ${currentBalance} XLM`,
        }),
      });

      slackSent = true;
    } catch (err: any) {
      errors.push("Slack failed: " + err.message);
    }
  }

  return { slackSent, emailSent, errors };
}