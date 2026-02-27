import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ResetHwidRequest {
  key_code: string;
  secret?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { key_code, secret }: ResetHwidRequest = await req.json();

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (secret) {
      const discordSecret = Deno.env.get("DISCORD_API_SECRET");
      if (secret !== discordSecret) {
        return new Response(
          JSON.stringify({ error: "Invalid secret" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } else if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_ANON_KEY") ?? "",
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      );

      const {
        data: { user },
      } = await supabaseClient.auth.getUser();

      if (!user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      userId = user.id;
    } else {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: key, error: keyError } = await supabaseClient
      .from("keys")
      .select("*")
      .eq("key_code", key_code)
      .maybeSingle();

    if (keyError || !key) {
      return new Response(
        JSON.stringify({ error: "Key not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (userId && key.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: "Key does not belong to you" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (key.status === "blocked") {
      return new Response(
        JSON.stringify({ error: "Key is blocked" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (key.status === "expired") {
      return new Response(
        JSON.stringify({ error: "Key has expired" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!key.hwid) {
      return new Response(
        JSON.stringify({ error: "Key has no HWID to reset" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date();
    if (key.last_hwid_reset_at) {
      const lastReset = new Date(key.last_hwid_reset_at);
      const daysSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceReset < 30) {
        const daysRemaining = Math.ceil(30 - daysSinceReset);
        return new Response(
          JSON.stringify({
            error: `HWID reset is only allowed once per 30 days. Please wait ${daysRemaining} more days.`
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    const { error: updateError } = await supabaseClient
      .from("keys")
      .update({
        hwid: null,
        hwid_reset_count: key.hwid_reset_count + 1,
        last_hwid_reset_at: now.toISOString(),
        status: "active",
      })
      .eq("id", key.id);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: "Failed to reset HWID" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "HWID reset successfully",
        reset_count: key.hwid_reset_count + 1,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error resetting HWID:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
