import { useEffect, useRef, useState } from "react";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? "";
const scriptUrl = "https://accounts.google.com/gsi/client";

export default function GoogleSignInButton({
  onCredential,
  onError,
  text = "signin_with",
}: {
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
  text?: "signin_with" | "signup_with" | "continue_with";
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!googleClientId) return;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
    if (window.google) {
      setScriptReady(true);
      return;
    }
    const script = existing ?? document.createElement("script");
    const onLoad = () => setScriptReady(true);
    const onFailure = () => onError("Google sign-in could not be loaded. Check your connection and try again.");
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onFailure);
    if (!existing) {
      script.src = scriptUrl;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    return () => {
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onFailure);
    };
  }, [onError]);

  useEffect(() => {
    if (!scriptReady || !buttonRef.current || !window.google || !googleClientId) return;
    buttonRef.current.replaceChildren();
    window.google.accounts.id.initialize({
      client_id: googleClientId,
      callback: ({ credential }) => onCredentialRef.current(credential),
      context: "signin",
      ux_mode: "popup",
    });
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      shape: "rectangular",
      width: 280,
      text,
    });
  }, [scriptReady, text]);

  if (!googleClientId) {
    return <p className="text-sm text-red-700">Set VITE_GOOGLE_CLIENT_ID in ui/.env.local to enable Google sign-in.</p>;
  }
  return <div ref={buttonRef} className="min-h-10" aria-label="Continue with Google" />;
}
