import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { encrypt, decrypt } from "@/lib/crypto";
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
      await supabaseAdmin
        .from("emails")
        .update({ status: "failed", retry_count: (email.retry_count ?? 0) + 1 })
        .eq("id", email.id);
      await supabaseAdmin.from("email_logs").insert({
        email_id: email.id,
        event: "failed",
        message: "No active SMTP account configured for this org.",
      });
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

      await supabaseAdmin
        .from("emails")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", email.id);
      await supabaseAdmin
        .from("email_logs")
        .insert({ email_id: email.id, event: "sent", message: "Delivered" });
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Send failed";
      await supabaseAdmin
        .from("emails")
        .update({ status: "failed", retry_count: (email.retry_count ?? 0) + 1 })
        .eq("id", email.id);
      await supabaseAdmin
        .from("email_logs")
        .insert({ email_id: email.id, event: "failed", message: msg });
      return { ok: false, error: msg };
    }
  });

export const encryptSmtpPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ password: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => ({
    encrypted: encrypt(data.password),
  }));
