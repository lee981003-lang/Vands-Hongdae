import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const usernamePattern = /^[a-z0-9._]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const vandsEmailSuffix = "@vands.local";

type Action = "create" | "set_password" | "list";
type Role = "staff" | "admin";
type RequestBody = {
  action?: Action;
  username?: unknown;
  password?: unknown;
  role?: unknown;
  display_name?: unknown;
  user_id?: unknown;
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

function error(message: string, status: number) {
  return json({ error: message }, status);
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isRole(value: unknown): value is Role {
  return value === "staff" || value === "admin";
}

function usernameFromEmail(email: string | undefined) {
  if (!email) return "";
  return email.toLowerCase().endsWith(vandsEmailSuffix) ? email.slice(0, -vandsEmailSuffix.length) : email;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return error("입력값을 확인해 주세요.", 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase Edge Function environment variables.");
    return error("요청을 처리할 수 없습니다.", 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const jwt = readBearerToken(request);

  if (!jwt) {
    return error("권한이 없습니다.", 403);
  }

  const { data: caller, error: callerError } = await admin.auth.getUser(jwt);

  if (callerError || !caller.user) {
    console.error("Failed to verify admin-users caller token.", callerError);
    return error("권한이 없습니다.", 403);
  }

  if (caller.user.app_metadata.role !== "admin") {
    return error("권한이 없습니다.", 403);
  }

  let body: RequestBody;

  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return error("입력값을 확인해 주세요.", 400);
    }
    body = parsed as RequestBody;
  } catch (parseError) {
    console.error("Failed to parse admin-users request body.", parseError);
    return error("입력값을 확인해 주세요.", 400);
  }

  if (body.action === "create") {
    if (typeof body.username !== "string" || !usernamePattern.test(body.username) || typeof body.password !== "string" || body.password.length < 8 || !isRole(body.role)) {
      return error("입력값을 확인해 주세요.", 400);
    }

    if (body.display_name !== undefined && typeof body.display_name !== "string") {
      return error("입력값을 확인해 주세요.", 400);
    }

    const username = body.username.toLowerCase();
    const displayName = body.display_name?.trim();
    const { data, error: createError } = await admin.auth.admin.createUser({
      email: `${username}${vandsEmailSuffix}`,
      password: body.password,
      email_confirm: true,
      app_metadata: { role: body.role },
      user_metadata: displayName ? { display_name: displayName } : {},
    });

    if (createError || !data.user) {
      console.error("Failed to create user.", createError);
      const isDuplicate = /already registered|already exists|duplicate/i.test(createError?.message ?? "");
      return error(isDuplicate ? "이미 존재하는 아이디입니다." : "계정을 생성할 수 없습니다.", 400);
    }

    return json({ user: { id: data.user.id } }, 201);
  }

  if (body.action === "set_password") {
    if (typeof body.user_id !== "string" || !uuidPattern.test(body.user_id) || typeof body.password !== "string" || body.password.length < 8) {
      return error("입력값을 확인해 주세요.", 400);
    }

    const { error: updateError } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password });

    if (updateError) {
      console.error("Failed to update user password.", updateError);
      return error("비밀번호를 변경할 수 없습니다.", 400);
    }

    return json({ ok: true });
  }

  if (body.action === "list") {
    const { data, error: listError } = await admin.auth.admin.listUsers();

    if (listError) {
      console.error("Failed to list users.", listError);
      return error("계정 목록을 불러올 수 없습니다.", 500);
    }

    return json({
      users: data.users.map((user) => ({
        id: user.id,
        username: usernameFromEmail(user.email),
        role: user.app_metadata.role ?? "staff",
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
      })),
    });
  }

  return error("입력값을 확인해 주세요.", 400);
});
