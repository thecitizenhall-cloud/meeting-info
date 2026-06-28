import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

const css = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:#0A0F1E; color:#E8EDF5; font-family:'Inter',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; min-height:100vh; }
  a { color:inherit; text-decoration:none; }

  .page { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:40px 20px; }
  .brand { font-size:15px; font-weight:700; margin-bottom:36px; letter-spacing:0.04em; }
  .brand span { color:#3B82F6; }

  .form-card { background:#1B2236; border:1px solid #2A3452; border-radius:16px; padding:36px; width:100%; max-width:400px; }
  .form-title { font-family:'Playfair Display',Georgia,serif; font-size:24px; color:#E8EDF5; margin-bottom:6px; }
  .form-sub { font-size:13px; color:#8A95AB; margin-bottom:28px; line-height:1.6; }

  .label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#8A95AB; margin-bottom:6px; }
  input { background:#111827; border:1px solid #2A3452; border-radius:8px; color:#E8EDF5; font-family:inherit; font-size:14px; padding:10px 14px; outline:none; width:100%; transition:border-color 0.15s; }
  input:focus { border-color:#3B82F6; }
  input::placeholder { color:#4A546A; }

  .btn { width:100%; background:#3B82F6; color:#fff; font-size:15px; font-weight:600; padding:12px; border-radius:9px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:opacity 0.15s; margin-top:18px; }
  .btn:hover:not(:disabled) { opacity:0.9; }
  .btn:disabled { opacity:0.5; cursor:not-allowed; }

  .status { font-size:14px; line-height:1.6; margin-top:14px; text-align:center; border-radius:8px; padding:12px 16px; }
  .status.ok { background:#0D2E1F; color:#10B981; border:1px solid #134D30; }
  .status.err { background:#2D0E0E; color:#EF4444; border:1px solid #4D1313; }

  .notice { font-size:12px; color:#4A546A; margin-top:8px; }
  .signup-link { font-size:13px; color:#8A95AB; text-align:center; margin-top:20px; }
  .signup-link a { color:#60A5FA; }

  @keyframes spin { to { transform:rotate(360deg); } }
  .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
`;

const ERROR_MESSAGES = {
  invalid_token: "That link is invalid — request a new one below.",
  expired_token: "That link expired — request a new one below.",
  account_canceled: "Your account has been canceled. Contact support if you'd like to resubscribe.",
  missing_token: "Missing login token — request a new one below.",
};

export default function Login() {
  const router = useRouter();
  const { error: urlError } = router.query;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(urlError ? { type: "err", msg: ERROR_MESSAGES[urlError] || "Something went wrong." } : null);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setStatus(null);
    setLoading(true);
    try {
      const r = await fetch("/api/pro/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      if (!r.ok) {
        setStatus({ type: "err", msg: data.error || "Something went wrong." });
      } else {
        setSent(true);
        setStatus({ type: "ok", msg: `We sent a sign-in link to ${email} — check your inbox.` });
      }
    } catch {
      setStatus({ type: "err", msg: "Network error — please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Sign in — Townhall Café Pro</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="page">
        <Link href="/" className="brand"><span>Townhall</span> Café Pro</Link>

        <div className="form-card">
          <h1 className="form-title">Sign in</h1>
          <p className="form-sub">Enter your account email and we'll send a sign-in link — no password needed.</p>

          {!sent && (
            <form onSubmit={submit}>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@smithdev.com"
                required
                autoFocus
              />
              <p className="notice">Link expires in 15 minutes.</p>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? "Sending…" : "Send sign-in link →"}
              </button>
            </form>
          )}

          {status && (
            <div className={`status ${status.type}`}>{status.msg}</div>
          )}

          <p className="signup-link">No account yet? <Link href="/signup">Create one</Link></p>
        </div>
      </div>
    </>
  );
}
