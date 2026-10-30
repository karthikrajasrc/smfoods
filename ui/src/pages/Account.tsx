import { useCallback, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import GoogleSignInButton from "../components/ui/GoogleSignInButton";
import { ButtonLoading, LoadingState } from "../components/ui/Loading";
import ScrollReveal from "../components/ui/ScrollReveal";
import { useAuth } from "../context/AuthContext";

type AccountMode = "login" | "register";

export default function Account() {
  const { user, loading, login, loginWithPassword, register, logout, error: sessionError } = useAuth();
  const [mode, setMode] = useState<AccountMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onCredential = useCallback(async (credential: string) => {
    setBusy(true);
    setError("");
    try {
      await login(credential);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Google sign-in failed.");
    } finally {
      setBusy(false);
    }
  }, [login]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") await register(name, email, password);
      else await loginWithPassword(email, password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not access your account.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Checking your account…" className="min-h-[40vh]" />;

  if (user) {
    return (
      <ScrollReveal><section className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-4xl font-bold text-paddy">Your account</h1>
        <div className="mt-8 flex items-center gap-4 rounded-lg border border-line p-4 sm:p-6">
          {user.picture && <img src={user.picture} alt="" referrerPolicy="no-referrer" className="h-14 w-14 rounded-full" />}
        <div className="min-w-0"><p className="break-words text-xl font-semibold">{user.name}</p><p className="break-all text-muted">{user.email}</p></div>
        </div>
        {user.isAdmin && <Link to="/admin" className="mt-6 inline-flex rounded bg-paddy px-5 py-3 font-semibold text-white">Open admin dashboard</Link>}
        <button type="button" disabled={busy} onClick={() => {
          setBusy(true);
          setError("");
          void logout()
            .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not sign out."))
            .finally(() => setBusy(false));
        }} className="mt-6 block rounded border border-line px-5 py-3 font-semibold hover:border-paddy disabled:opacity-60">
          {busy ? <ButtonLoading>Signing out…</ButtonLoading> : "Sign out"}
        </button>
        {(error || sessionError) && <p role="alert" className="mt-4 text-red-700">{error || sessionError}</p>}
      </section></ScrollReveal>
    );
  }

  return (
    <ScrollReveal><section className="mx-auto max-w-md px-4 py-12 md:py-16">
      <div className="rounded-xl border border-line bg-white p-6 shadow-sm md:p-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-paddy">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-2 text-sm text-muted">{mode === "login" ? "Sign in to continue to your SM Foods account." : "Register to enjoy a quicker checkout."}</p>
        </div>

        {(error || sessionError) && <p role="alert" className="mt-5 rounded bg-red-50 p-3 text-sm text-red-800">{error || sessionError}</p>}

        <form onSubmit={(event) => void submit(event)} className="mt-6 grid gap-4">
          {mode === "register" && <label className="text-sm font-medium">
            Full name
            <input required minLength={2} maxLength={120} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-3 focus:border-paddy focus:outline-none" />
          </label>}
          <label className="text-sm font-medium">
            Email address
            <input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-3 focus:border-paddy focus:outline-none" />
          </label>
          <label className="text-sm font-medium">
            Password
            <input required type="password" minLength={mode === "register" ? 8 : 1} maxLength={128} autoComplete={mode === "register" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded border border-line px-3 py-3 focus:border-paddy focus:outline-none" />
            {mode === "register" && <span className="mt-1 block text-xs font-normal text-muted">Use at least 8 characters.</span>}
          </label>
          <button type="submit" disabled={busy} className="mt-1 rounded bg-paddy px-5 py-3 font-semibold text-white transition hover:bg-paddy-soft disabled:opacity-60">
            {busy ? <ButtonLoading>{mode === "login" ? "Signing in…" : "Creating account…"}</ButtonLoading> : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button type="button" disabled={busy} onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }} className="font-semibold text-paddy underline underline-offset-2">
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>

        <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted">
          <span className="h-px flex-1 bg-line" /><span>or continue with</span><span className="h-px flex-1 bg-line" />
        </div>
        <div className="flex min-h-10 justify-center">
          {busy
            ? <ButtonLoading>Signing in with Google…</ButtonLoading>
            : <GoogleSignInButton onCredential={onCredential} onError={setError} text={mode === "register" ? "signup_with" : "signin_with"} />}
        </div>
        <p className="mt-5 text-center text-xs text-muted">You can also shop and checkout as a guest.</p>
      </div>
    </section></ScrollReveal>
  );
}
