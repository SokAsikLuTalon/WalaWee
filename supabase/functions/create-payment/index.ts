import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreatePaymentRequest {
  product_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
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

    const { product_id }: CreatePaymentRequest = await req.json();

    const { data: product, error: productError } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", product_id)
      .maybeSingle();

    if (productError || !product) {
      return new Response(
        JSON.stringify({ error: "Product not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (product.stock_count <= 0) {
      return new Response(
        JSON.stringify({ error: "Product out of stock" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: product.id,
        amount: product.price,
        payment_status: "pending",
      })
      .select()
      .single();

    if (orderError) {
      return new Response(
        JSON.stringify({ error: "Failed to create order" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const temanqrisApiKey = Deno.env.get("VITE_TEMANQRIS_API_KEY");

    const temanqrisResponse = await fetch("https://temanqris.com/api/create-payment", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${temanqrisApiKey}`,
      },
      body: JSON.stringify({
        amount: product.price,
        order_id: order.id,
        customer_name: user.email,
        description: `${product.name} - King Vypers Premium Key`,
      }),
    });

    if (!temanqrisResponse.ok) {
      await supabaseClient
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("id", order.id);

      return new Response(
        JSON.stringify({ error: "Failed to create payment" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const paymentData = await temanqrisResponse.json();

    await supabaseClient
      .from("orders")
      .update({
        payment_id: paymentData.payment_id,
        qris_url: paymentData.qris_url,
      })
      .eq("id", order.id);

    return new Response(
      JSON.stringify({
        success: true,
        order_id: order.id,
        payment_id: paymentData.payment_id,
        qris_url: paymentData.qris_url,
        amount: product.price,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error creating payment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
