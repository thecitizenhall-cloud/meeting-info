import Head from "next/head";
import Link from "next/link";
import { useState } from "react";

// Available municipalities — add as civic engine covers more towns.
const AVAILABLE_MUNICIPALITIES = [
  { key: "jackson_nj", name: "Jackson Township, Ocean County NJ" },
  { key: "lakewood_nj", name: "Lakewood Township, Ocean County NJ" },
  // Add more as coverage expands:
  // { key: "toms_river_nj", name: "Toms River Township, Ocean County NJ" },
];

const PRICE_DISPLAY = process.env.NEXT_PUBLIC_PRICE_DISPLAY || "contact us for pricing";

const css = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:#0A0F1E; color:#E8EDF5; font-family:'Inter',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; min-height:100vh; }
  a { color:inherit; text-decoration:none; }

  .page { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; padding:40px 20px; }
  .brand { font-size:15px; font-weight:700; margin-bottom:36px; letter-spacing:0.04em; }
  .brand span { color:#3B82F6; }

  .form-card { background:#1B2236; border:1px solid #2A3452; border-radius:16px; padding:36px; width:100%; max-width:480px; }
  .form-title { font-family:'Playfair Display',Georgia,serif; font-size:24px; color:#E8EDF5; margin-bottom:6px; }
  .form-sub { font-size:13px; color:#8A95AB; margin-bottom:28px; }

  .field { margin-bottom:18px; }
  .label { display:block; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:#8A95AB; margin-bottom:6px; }
  input { background:#111827; border:1px solid #2A3452; border-radius:8px; color:#E8EDF5; font-family:inherit; font-size:14px; padding:10px 14px; outline:none; width:100%; transition:border-color 0.15s; }
  input:focus { border-color:#3B82F6; }
  input::placeholder { color:#4A546A; }

  .township-grid { display:flex; flex-direction:column; gap:10px; }
  .township-opt { display:flex; align-items:flex-start; gap:12px; background:#111827; border:1px solid #2A3452; border-radius:10px; padding:12px 14px; cursor:pointer; transition:border-color 0.15s; }
  .township-opt.selected { border-color:#3B82F6; background:#1E3A5F; }
  .township-opt input[type=checkbox] { width:16px; height:16px; flex-shrink:0; margin-top:2px; accent-color:#3B82F6; }
  .township-name { font-size:14px; color:#E8EDF5; font-weight:500; }
  .township-price { font-size:12px; color:#8A95AB; }

  .price-summary { background:#111827; border:1px solid #2A3452; border-radius:8px; padding:12px 14px; margin:20px 0; display:flex; justify-content:space-between; align-items:center; }
  .price-summary-label { font-size:13px; color:#8A95AB; }
  .price-summary-val { font-size:16px; font-weight:700; color:#E8EDF5; }

  .btn { width:100%; background:#3B82F6; color:#fff; font-size:15px; font-weight:600; padding:13px; border-radius:9px; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:10px; transition:opacity 0.15s; }
  .btn:hover:not(:disabled) { opacity:0.9; }
  .btn:disabled { opacity:0.5; cursor:not-allowed; }

  .error { font-size:13px; color:#EF4444; margin-top:14px; text-align:center; }
  .signin-link { font-size:13px; color:#8A95AB; text-align:center; margin-top:20px; }
  .signin-link a { color:#60A5FA; }

  @keyframes spin { to { transform:rotate(360deg); } }
  .spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:#fff; border-radius:50%; animation:spin 0.7s linear infinite; }
`;

export default function Signup() {
  const [form, setForm] = useState({ name: "", company: "", email: "" });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggle(muni) {
    setSelected(prev =>
      prev.find(t => t.key === muni.key) ? prev.filter(t => t.key !== muni.key) : [...prev, muni]
    );
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (selected.length === 0) { setError("Select at least one township."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/pro/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, townships: selected }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error || "Something went wrong."); return; }
      window.location.href = data.url;
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
    }
  }

  const monthlyTotal = PRICE_DISPLAY !== "contact us for pricing" && !isNaN(Number(PRICE_DISPLAY.replace(/[^0-9.]/g, "")))
    ? `$${(parseFloat(PRICE_DISPLAY.replace(/[^0-9.]/g, "")) * selected.length).toFixed(0)}/mo`
    : selected.length > 0 ? `${selected.length} township${selected.length > 1 ? "s" : ""}` : "—";

  return (
    <>
      <Head>
        <title>Sign up — Townhall Café Pro</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="page">
        <Link href="/" className="brand"><span>Townhall</span> Café Pro</Link>

        <div className="form-card">
          <h1 className="form-title">Create your account</h1>
          <p className="form-sub">You'll be taken to secure payment after this step.</p>

          <form onSubmit={submit}>
            <div className="field">
              <label className="label">Full name</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Jane Smith"
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label className="label">Company <span style={{ color: "#4A546A", fontWeight: 400 }}>(optional)</span></label>
              <input
                value={form.company}
                onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                placeholder="Smith Development LLC"
              />
            </div>
            <div className="field">
              <label className="label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="jane@smithdev.com"
                required
              />
            </div>

            <div className="field">
              <label className="label" style={{ marginBottom: "10px" }}>Townships to monitor</label>
              <div className="township-grid">
                {AVAILABLE_MUNICIPALITIES.map(muni => {
                  const isSelected = selected.some(t => t.key === muni.key);
                  return (
                    <label key={muni.key} className={`township-opt${isSelected ? " selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggle(muni)}
                      />
                      <div>
                        <div className="township-name">{muni.name}</div>
                        <div className="township-price">{PRICE_DISPLAY}/mo</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {selected.length > 0 && (
              <div className="price-summary">
                <span className="price-summary-label">Monthly total ({selected.length} township{selected.length > 1 ? "s" : ""})</span>
                <span className="price-summary-val">{monthlyTotal}</span>
              </div>
            )}

            <button type="submit" className="btn" disabled={loading || selected.length === 0}>
              {loading ? <span className="spinner" /> : null}
              {loading ? "Redirecting to payment…" : "Continue to payment →"}
            </button>

            {error && <div className="error">{error}</div>}
          </form>

          <p className="signin-link">Already have an account? <Link href="/login">Sign in</Link></p>
        </div>
      </div>
    </>
  );
}
