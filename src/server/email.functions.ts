import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import nodemailer from "nodemailer";

const sendSchema = z.object({
  emailId: z.string().uuid(),
});

/**
 * Sends one email row by id. Loads org SMTP, sends via nodemailer,
 * updates status + logs the event. Caller must own (RLS) or be admin.
 */
export const sendEmailNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => sendSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Fetch the email under user RLS (ensures access)
    const { data: email, error: eErr } = await supabase
      .from("emails")
      .select("*")
      .eq("id", data.emailId)
      .maybeSingle();
    if (eErr || !email) throw new Error("Email not found");

    // Use admin client only for SMTP password decryption + status writes
    const { data: smtp } = await supabaseAdmin
      .from("smtp_accounts")
      .select("*")
      .eq("org_id", email.org_id)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!smtp) {
      await supabaseAdmin.from("emails").update({ status: "failed", retry_count: (email.retry_count ?? 0) + 1 }).eq("id", email.id);
      await supabaseAdmin.from("email_logs").insert({ email_id: email.id, event: "failed", message: "No active SMTP account configured for this org." });
      return { ok: false, error: "No active SMTP account configured." };
    }

    const password = decrypt(smtp.encrypted_password);

    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: { user: smtp.username, pass: password },
      });

      await transporter.sendMail({
        from: `"${smtp.from_name}" <${smtp.from_email}>`,
        to: email.to_name ? `"${email.to_name}" <${email.to_email}>` : email.to_email,
        subject: email.subject,
        html: email.html_body,
      });

      await supabaseAdmin.from("emails").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", email.id);
      await supabaseAdmin.from("email_logs").insert({ email_id: email.id, event: "sent", message: "Delivered" });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      await supabaseAdmin.from("emails").update({ status: "failed", retry_count: (email.retry_count ?? 0) + 1 }).eq("id", email.id);
      await supabaseAdmin.from("email_logs").insert({ email_id: email.id, event: "failed", message: msg });
      return { ok: false, error: msg };
    }
  });

// Lightweight reversible encoding for SMTP passwords using ENCRYPTION_KEY env var.
// (Server-side only; uses crypto AES-256-GCM.)
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function getKey() {
  const k = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "fallback-dev-key";
  return createHash("sha256").update(k).digest();
}

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decrypt(payload: string): string {
  const [ivB, tagB, dataB] = payload.split(":");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB, "base64"));
  decipher.setAuthTag(Buffer.from(tagB, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB, "base64")), decipher.final()]);
  return dec.toString("utf8");
}

export const encryptSmtpPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ password: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => ({ encrypted: encrypt(data.password) }));