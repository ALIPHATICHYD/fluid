import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { sendLowBalanceAlert, resetCooldown } from "./services/alertService";
import StellarSdk from "@stellar/stellar-sdk";

// Load .env explicitly
dotenv.config({ path: path.resolve(process.cwd(), ".env") });


console.log("ENV TEST:", process.env.SMTP_HOST);

async function main(): Promise<void> {
  console.log("SMTP Host:", process.env.SMTP_HOST);
  console.log("SMTP User:", process.env.SMTP_USER);

  const secret = process.env.FLUID_FEE_PAYER_SECRET?.split(",")[0].trim();

  const accountId = secret
    ? StellarSdk.Keypair.fromSecret(secret).publicKey()
    : "GDTESTACCOUNTPLACEHOLDER00000000000000000000000000000000001";

  const threshold = parseFloat(process.env.FLUID_LOW_BALANCE_THRESHOLD_XLM ?? "10");
  const simulatedBalance = 1.5;

  resetCooldown(accountId);
  process.env.FLUID_LOW_BALANCE_ALERT_COOLDOWN_MS = "0";

  console.log("═══════════════════════════════════════════════════");
  console.log("  Fluid — Fee-Payer Low Balance Alert (TEST FIRE)  ");
  console.log("═══════════════════════════════════════════════════");
  console.log(`  Account  : ${accountId}`);
  console.log(`  Balance  : ${simulatedBalance} XLM`);
  console.log(`  Threshold: ${threshold} XLM`);
  console.log(`  Slack    : ${process.env.SLACK_WEBHOOK_URL ? "✓ configured" : "✗ not set"}`);
  console.log(`  Email    : ${process.env.SMTP_HOST ? "✓ configured" : "✗ not set"}`);
  console.log("═══════════════════════════════════════════════════\n");

  if (!process.env.SMTP_HOST && !process.env.SLACK_WEBHOOK_URL) {
    console.error("ERROR: No alert transport configured.");
    process.exit(1);
  }

  try {
    const result = await sendLowBalanceAlert({
      accountId,
      currentBalance: simulatedBalance,
      threshold,
      network: "testnet",
    });

    console.log("─── Result ─────────────────────────────────────────");
    console.log(`  Slack sent : ${result.slackSent}`);
    console.log(`  Email sent : ${result.emailSent}`);
    console.log(`  Errors     : ${result.errors.length ? result.errors.join(", ") : "none"}`);
    console.log("────────────────────────────────────────────────────\n");

    if (result.errors.length > 0) process.exit(1);

    console.log("✓ Done! Check your email for the alert.");
  } catch (err) {
    console.error("Unhandled error:", err);
    process.exit(1);
  }
}

main();