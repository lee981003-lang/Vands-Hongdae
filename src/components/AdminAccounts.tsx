import { FormEvent, useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Toast } from "./Toast";

type Account = {
  id: string;
  username: string;
  role: "admin" | "staff";
  created_at: string;
  last_sign_in_at: string | null;
};

type FunctionResponse = {
  error?: string;
  users?: Account[];
};

type ToastTone = "success" | "error";

async function functionErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const payload = (await context.json()) as { error?: unknown };
        if (typeof payload.error === "string") return payload.error;
      } catch {
        // Use the general fallback when the function response is not JSON.
      }
    }
  }

  return fallback;
}

function formatDate(value: string | null) {
  if (!value) return "없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

export function AdminAccounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Account["role"]>("staff");
  const [displayName, setDisplayName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<ToastTone>("success");

  const showMessage = (nextMessage: string, tone: ToastTone) => {
    setMessage(nextMessage);
    setMessageTone(tone);
  };

  const loadAccounts = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      showMessage("Supabase 연결 설정을 확인해 주세요.", "error");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke<FunctionResponse>("admin-users", { body: { action: "list" } });

    if (error) {
      showMessage(await functionErrorMessage(error, "계정 목록을 불러올 수 없습니다."), "error");
    } else if (!data?.users) {
      showMessage(data?.error ?? "계정 목록을 불러올 수 없습니다.", "error");
    } else {
      const users = data.users;
      setAccounts(users);
      setSelectedUserId((current) => (current && users.some((account) => account.id === current) ? current : users[0]?.id ?? ""));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAccounts();
  }, [loadAccounts]);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    setCreating(true);
    const { data, error } = await supabase.functions.invoke<FunctionResponse>("admin-users", {
      body: { action: "create", username, password, role, display_name: displayName || undefined },
    });
    setCreating(false);

    if (error || data?.error) {
      showMessage(error ? await functionErrorMessage(error, "계정을 생성할 수 없습니다.") : data?.error ?? "계정을 생성할 수 없습니다.", "error");
      return;
    }

    setUsername("");
    setPassword("");
    setDisplayName("");
    showMessage("계정을 생성했습니다.", "success");
    await loadAccounts();
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !selectedUserId) return;

    setChangingPassword(true);
    const { data, error } = await supabase.functions.invoke<FunctionResponse>("admin-users", {
      body: { action: "set_password", user_id: selectedUserId, password: newPassword },
    });
    setChangingPassword(false);

    if (error || data?.error) {
      showMessage(error ? await functionErrorMessage(error, "비밀번호를 변경할 수 없습니다.") : data?.error ?? "비밀번호를 변경할 수 없습니다.", "error");
      return;
    }

    setNewPassword("");
    showMessage("비밀번호를 변경했습니다.", "success");
    await loadAccounts();
  };

  return (
    <section className="admin-accounts" role="tabpanel" aria-label="계정 관리">
      <div className="admin-accounts__grid">
        <form className="admin-card" onSubmit={(event) => void handleCreate(event)}>
          <div className="admin-card__heading">
            <h1>계정 생성</h1>
            <p>아이디와 초기 비밀번호를 입력해 새 계정을 만듭니다.</p>
          </div>
          <label>
            아이디
            <input value={username} onChange={(event) => setUsername(event.target.value)} pattern="[a-z0-9._]+" autoCapitalize="none" autoComplete="off" required />
          </label>
          <label>
            표시 이름 <span>선택</span>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" />
          </label>
          <label>
            역할
            <select value={role} onChange={(event) => setRole(event.target.value as Account["role"])}>
              <option value="staff">직원</option>
              <option value="admin">관리자</option>
            </select>
          </label>
          <label>
            초기 비밀번호
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} autoComplete="new-password" required />
          </label>
          <button className="admin-card__button admin-card__button--primary" type="submit" disabled={creating}>
            {creating ? "생성 중…" : "계정 생성"}
          </button>
        </form>

        <form className="admin-card" onSubmit={(event) => void handlePasswordChange(event)}>
          <div className="admin-card__heading">
            <h1>비밀번호 변경</h1>
            <p>목록에서 선택한 계정의 비밀번호를 변경합니다.</p>
          </div>
          <label>
            대상 계정
            <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} disabled={loading || accounts.length === 0}>
              {accounts.length === 0 ? <option value="">선택 가능한 계정이 없습니다.</option> : accounts.map((account) => <option value={account.id} key={account.id}>{account.username} · {account.role === "admin" ? "관리자" : "직원"}</option>)}
            </select>
          </label>
          <label>
            새 비밀번호
            <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} autoComplete="new-password" required disabled={!selectedUserId} />
          </label>
          <button className="admin-card__button admin-card__button--danger" type="submit" disabled={changingPassword || !selectedUserId}>
            {changingPassword ? "변경 중…" : "비밀번호 변경"}
          </button>
        </form>
      </div>

      <section className="admin-card admin-accounts__list" aria-live="polite">
        <div className="admin-card__heading admin-accounts__list-heading">
          <div>
            <h1>계정 목록</h1>
            <p>생성일과 마지막 로그인 시각을 확인할 수 있습니다.</p>
          </div>
          <button className="admin-card__button" type="button" onClick={() => void loadAccounts()} disabled={loading}>새로고침</button>
        </div>
        {loading ? <p className="admin-accounts__empty">계정 목록을 불러오는 중입니다.</p> : accounts.length === 0 ? <p className="admin-accounts__empty">등록된 계정이 없습니다.</p> : (
          <div className="admin-accounts__table-wrap">
            <table>
              <thead>
                <tr><th>아이디</th><th>역할</th><th>생성일</th><th>마지막 로그인</th></tr>
              </thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.username}</td>
                    <td>{account.role === "admin" ? "관리자" : "직원"}</td>
                    <td>{formatDate(account.created_at)}</td>
                    <td>{formatDate(account.last_sign_in_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {message ? <Toast message={message} tone={messageTone} onClose={() => setMessage(null)} /> : null}
    </section>
  );
}
