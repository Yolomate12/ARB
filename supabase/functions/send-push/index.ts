import { serve } from "https://deno.land/std/http/server.ts";

serve(async (req) => {
  const payload = await req.json();
  const record = payload.record;

  const deviceId = record.device_id;
  const level = record.level;

  // 1. Nájdeme organizáciu podľa device_id
  const orgRes = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/bin?select=id_org&id_device=eq.${deviceId}`,
    {
      headers: {
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    }
  );

  const orgData = await orgRes.json();
  const orgId = orgData?.[0]?.id_org;

  if (!orgId) {
    console.log("Žiadna organizácia pre device:", deviceId);
    return new Response("NO_ORG");
  }

  // 2. Nájdeme všetkých userov v organizácii
  const usersRes = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/rest/v1/profiles?select=push_token&id_org=eq.${orgId}`,
    {
      headers: {
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
    }
  );

  const users = await usersRes.json();

  // 3. Pošleme push notifikáciu každému userovi
  for (const u of users) {
    if (!u.push_token) continue;

    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: u.push_token,
        title: "Upozornenie",
        body: `Nádoba je naplnená na ${level}%`,
      }),
    });
  }

  return new Response("OK");
});
