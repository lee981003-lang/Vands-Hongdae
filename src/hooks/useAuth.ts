import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

export type AppRole = "admin" | "staff";

function roleFromSession(session: Session | null): AppRole {
  return session?.user.app_metadata.role === "admin" ? "admin" : "staff";
}

function loginEmail(loginId: string) {
  const trimmed = loginId.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@vands.local`;
}

export function useAuth() {
  const isDevelopmentFallback = import.meta.env.DEV && !hasSupabaseConfig;
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(isDevelopmentFallback || !hasSupabaseConfig);

  useEffect(() => {
    const client = supabase;
    if (!client) return undefined;

    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setReady(true);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (loginId: string, password: string) => {
    const client = supabase;
    if (!client) return "Supabase 연결 설정을 확인해 주세요.";

    if (!loginId.trim() || !password) return "아이디와 비밀번호를 입력해 주세요.";

    const { error } = await client.auth.signInWithPassword({
      email: loginEmail(loginId),
      password,
    });

    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut({ scope: "local" });
    setSession(null);
  }, []);

  return useMemo(
    () => ({
      ready,
      session,
      role: roleFromSession(session),
      isDevelopmentFallback,
      signIn,
      signOut,
    }),
    [isDevelopmentFallback, ready, session, signIn, signOut],
  );
}
