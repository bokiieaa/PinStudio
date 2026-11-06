// Supabase Edge Function: send-pin-submission
// Set secrets in Supabase: RESEND_API_KEY and OWNER_EMAIL.
// Deploy with: supabase functions deploy send-pin-submission
// The function sends a notification; the uploaded design remains in private Supabase Storage.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("re_B8oFUdnb_P8qVFk33V2Zx8TYhFAHEVget");
    const ownerEmail = Deno.env.get("hunter.noble@daviestech.org");
    if (!apiKey || !ownerEmail) throw new Error("Email function is not configured.");

    const body = await req.json();
    const { submission_id, customer_name, customer_email, package_quantity, package_price, original_filename, notes } = body;
    if (!submission_id || !customer_name || !customer_email || ![1,5,12].includes(Number(package_quantity))) {
      return new Response(JSON.stringify({ error: "Invalid submission details." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const safe = (s) => String(s ?? "").replace(/[<>]/g, "");
    const message = [
      "New pin design submission",
      "",
      `Submission ID: ${safe(submission_id)}`,
      `Name: ${safe(customer_name)}`,
      `Email: ${safe(customer_email)}`,
      `Package: ${Number(package_quantity)} pins — $${Number(package_price)}`,
      `File: ${safe(original_filename)}`,
      "",
      "Notes:",
      safe(notes) || "(none)",
      "",
      "The design file is stored in the private 'pin-designs' Supabase Storage bucket.",
      "Find the submission row in the pin_submissions table and use design_path to locate its file."
    ].join("\n");

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Pin Studio <onboarding@resend.dev>",
        to: [ownerEmail],
        reply_to: customer_email,
        subject: `New pin design submission — ${safe(customer_name)}`,
        text: message
      })
    });
    if (!resp.ok) throw new Error(`Email provider error: ${await resp.text()}`);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
