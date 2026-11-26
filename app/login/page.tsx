"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Mail, LockKeyhole, Eye, EyeOff, ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import FormaLoader from "../../components/FormaLoader";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { error: loginError } = await createClient().auth.signInWithPassword({ email: email.trim(), password });
      if (loginError) {
        setError("No se ha podido iniciar sesión. Revisa tus credenciales e inténtalo de nuevo.");
        setLoading(false);
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("No se ha podido conectar. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-wrap">
        <header className="brand">
          <Image src="/isotipo.png" alt="" width={82} height={82} priority style={{ borderRadius: 23, objectFit: "contain" }} />
          <h1>FORMA</h1>
          <p>NUTRICIÓN · ENTRENAMIENTO · PROGRESO</p>
        </header>
        <section className="login-card" aria-labelledby="login-title">
          <h2 id="login-title">Bienvenida a FORMA</h2>
          <p className="intro">Tu bienestar, en un solo lugar.</p>
          <form onSubmit={handleLogin} aria-busy={loading}>
            <label htmlFor="email">Correo electrónico</label>
            <div className="field">
              <Mail size={19} strokeWidth={1.7} aria-hidden="true" />
              <input id="email" name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} placeholder="Tu correo electrónico" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
            </div>
            <label htmlFor="password">Contraseña</label>
            <div className="field">
              <LockKeyhole size={19} strokeWidth={1.7} aria-hidden="true" />
              <input id="password" name="password" type={visible ? "text" : "password"} autoComplete="current-password" placeholder="Tu contraseña" value={password} onChange={e => setPassword(e.target.value)} required disabled={loading} />
              <button className="visibility" type="button" disabled={loading} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVisible(v => !v)}>{visible ? <EyeOff size={19}/> : <Eye size={19}/>}</button>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            {loading ? <FormaLoader size={32} minHeight={54}/> : <button className="submit" type="submit">Iniciar sesión <ArrowRight size={19} strokeWidth={1.8}/></button>}
          </form>
        </section>
        <footer><ShieldCheck size={15} strokeWidth={1.7}/> Acceso privado y seguro</footer>
      </div>
      <style jsx>{`
        .login-page { min-height: 100dvh; box-sizing: border-box; display: grid; place-items: center; padding: calc(32px + env(safe-area-inset-top)) 22px calc(32px + env(safe-area-inset-bottom)); background: #F7F8F6; color: #25382F; }
        .login-wrap { width: 100%; max-width: 390px; min-width: 0; }
        .brand { text-align: center; margin-bottom: 32px; }
        .brand h1 { font-size: 30px; font-weight: 600; letter-spacing: .22em; padding-left: .22em; color: #7D8C82; margin: 14px 0 8px; }
        .brand p { font-size: 9px; letter-spacing: .09em; color: #687A6D; margin: 0; }
        .login-card { background: #fff; border: 1px solid #E5EAE5; border-radius: 24px; padding: 25px 22px; }
        h2 { font-size: 21px; line-height: 1.4; font-weight: 600; margin: 0 0 6px; }
        .intro { font-size: 12px; color: #687A6D; margin: 0 0 26px; }
        form { display: flex; flex-direction: column; gap: 8px; }
        label { font-size: 12px; font-weight: 500; }
        .field { display: flex; align-items: center; gap: 10px; border: 1px solid #E0E6E0; border-radius: 12px; padding: 0 13px; color: #7D8C82; min-height: 52px; margin-bottom: 10px; }
        .field:focus-within { border-color: #7D8C82; box-shadow: 0 0 0 2px #E5EBE5; }
        input { flex: 1; width: 0; min-width: 0; border: 0; outline: none; background: transparent; padding: 13px 0; font: inherit; font-size: 16px; color: #25382F; }
        input::placeholder { color: #929C95; font-size: 13px; }
        .visibility { display: grid; place-items: center; border: 0; background: transparent; color: #7D8C82; padding: 8px 0 8px 4px; cursor: pointer; }
        .submit { display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 54px; border: 0; border-radius: 13px; background: #7D8C82; color: white; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 4px; }
        .submit:hover { background: #687A6D; }
        .error { color: #B45353; background: #FBF2F2; border-radius: 10px; padding: 10px; font-size: 12px; margin: 0; }
        footer { display: flex; justify-content: center; align-items: center; gap: 7px; color: #687A6D; font-size: 11px; margin-top: 24px; }
        button:focus-visible { outline: 2px solid #596B60; outline-offset: 3px; }
        @media (max-width: 360px) { .login-page { padding-left: 15px; padding-right: 15px; } .login-card { padding: 22px 16px; } }
      `}</style>
    </main>
  );
}
