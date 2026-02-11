import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { action, ...payload } = await req.json();

  try {
    if (action === "create") {
      const { name, email, password, role_id } = payload;

      const { data: authData, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .insert({
          user_id: authData.user.id,
          name,
          email,
          role_id: role_id || null,
          status: "ACTIVE",
        })
        .select()
        .single();
      if (profileError) throw profileError;

      return new Response(JSON.stringify({ profile }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update") {
      const { profile_id, user_id, name, email, role_id, password, status } =
        payload;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (role_id !== undefined) updates.role_id = role_id || null;
      if (status !== undefined) updates.status = status;

      if (Object.keys(updates).length > 0) {
        await supabase.from("profiles").update(updates).eq("id", profile_id);
      }

      if (user_id) {
        const authUpdates: Record<string, unknown> = {};
        if (email) authUpdates.email = email;
        if (password) authUpdates.password = password;
        if (status === "DISABLED") authUpdates.ban_duration = "876000h";
        if (status === "ACTIVE") authUpdates.ban_duration = "none";

        if (Object.keys(authUpdates).length > 0) {
          await supabase.auth.admin.updateUserById(user_id, authUpdates);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { profile_id, user_id } = payload;
      if (user_id) {
        await supabase.auth.admin.deleteUser(user_id);
      }
      await supabase.from("profiles").delete().eq("id", profile_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
