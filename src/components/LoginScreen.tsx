import { type FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import vandsLogo from "../assets/vands-logo.png";

interface LoginScreenProps {
  onSignIn: (loginId: string, password: string) => Promise<string | null>;
}

export function LoginScreen({ onSignIn }: LoginScreenProps) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const nextError = await onSignIn(loginId, password);
    if (nextError) setError("아이디 또는 비밀번호를 확인해 주세요.");
    setSubmitting(false);
  };

  return (
    <main className="auth-shell">
      <form className="login-panel" onSubmit={handleSubmit}>
        <img className="login-panel__logo" src={vandsLogo} alt="Vands 홍대" />
        <div className="login-panel__fields">
          <label>
            <span>아이디</span>
            <input
              autoComplete="username"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              required
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
        </div>
        {error ? <p className="login-panel__error" role="alert">{error}</p> : null}
        <button className="login-panel__submit" type="submit" disabled={submitting}>
          <LogIn size={18} aria-hidden="true" />
          로그인
        </button>
      </form>
    </main>
  );
}
