import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const C = {
  bg: "#0A0F1E", bg2: "#111827", surface: "#1B2236", border: "#2A3452",
  text: "#E8EDF5", dim: "#8A95AB", faint: "#4A546A",
  blue: "#3B82F6", blueHi: "#60A5FA",
  green: "#10B981", red: "#EF4444",
};

const css = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:${C.bg}; color:${C.text}; font-family:'Inter',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; min-height:100vh; }
  a { color:inherit; text-decoration:none; }

  .layout { display:flex; min-height:100vh; }
  .sidebar { width:220px; flex-shrink:0; border-right:1px solid ${C.border}; padding:24px 16px; display:flex; flex-direction:column; gap:4px; }
  .sidebar-brand { font-size:14px; font-weight:700; letter-spacing:0.04em; padding:0 8px; margin-bottom:20px; }
  .sidebar-brand span { color:${C.blue}; }
  .nav-item { display:flex; align-items:center; gap:10px; padding:9px 12px; border-radius:8px; font-size:14px; color:${C.dim}; cursor:pointer; transition:background 0.12s; text-decoration:none; }
  .nav-item:hover { background:${C.surface}; color:${C.text}; }
  .nav-item.active { background:${C.surface}; color:${C.text}; font-weight:500; }
  .nav-icon { font-size:16px; }
  .sidebar-footer { margin-top:auto; }
  .logout-btn { width:100%; background:none; border:none; padding:9px 12px; border-radius:8px; font-size:13px; color:${C.faint}; cursor:pointer; text-align:left; font-family:inherit; display:flex; align-items:center; gap:8px; transition:background 0.12s; }
  .logout-btn:hover { background:${C.surface}; color:${C.dim}; }

  .main { flex:1; }
  .topbar { display:flex; align-items:center; padding:20px 32px; border-bottom:1px solid ${C.border}; }
  .page-title { font-family:'Playfair Display',Georgia,serif; font-size:22px; color:${C.text}; }

  .content { padding:32px; max-width:600px; }
  .section-mb { margin-bottom:32px; }
  .section-title { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:${C.dim}; margin-bottom:14px; }

  .card { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:22px 24px; }
  .field { margin-bottom:18px; }
  .label { display:block; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:${C.dim}; margin-bottom:8px; }
  input[type=text], input[type=email] { background:${C.bg2}; border:1px solid ${C.border}; border-radius:8px; color:${C.text}; font-family:inherit; font-size:14px; padding:10px 14px; outline:none; width:100%; transition:border-color 0.15s; }
  input:focus { border-color:${C.blue}; }
  input::placeholder { color:${C.faint}; }

  .radio-group, .check-group { display:flex; flex-direction:column; gap:8px; }
  .radio-opt, .check-opt { display:flex; align-items:center; gap:12px; background:${C.bg2}; border:1px solid ${C.border}; border-radius:8px; padding:11px 14px; cursor:pointer; transition:border-color 0.12s; }
  .radio-opt.selected, .check-opt.selected { border-color:${C.blue}; }
  .radio-opt input, .check-opt input { accent-color:${C.blue}; flex-shrink:0; }
  .radio-label { font-size:14px; color:${C.text}; }
  .radio-desc { font-size:12px; color:${C.dim}; }

  .save-btn { background:${C.blue}; color:#fff; border:none; border-radius:8px; font-size:14px; font-weight:600; padding:11px 24px; cursor:pointer; font-family:inherit; transition:opacity 0.15s; margin-top:4px; }
  .save-btn:hover:not(:disabled) { opacity:0.9; }
  .save-btn:disabled { opacity:0.5; cursor:not-allowed; }

  .status-msg { font-size:13px; margin-top:10px; }
  .status-ok { color:${C.green}; }
  .status-err { color:${C.red}; }

  @media (max-width:680px) {
    .layout { flex-direction:column; }
    .sidebar { width:100%; border-right:none; border-bottom:1px solid ${C.border}; flex-direction:row; flex-wrap:wrap; padding:12px; }
    .sidebar-footer { margin-top:0; }
    .content { padding:20px; }
    .topbar { padding:16px 20px; }
  }
`;

const FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly digest", desc: "One email per week summarizing all new activity." },
  { value: "daily", label: "Daily digest", desc: "Morning summary of the previous day's activity." },
  { value: "instant", label: "Instant alerts", desc: "Email as soon as the civic engine publishes new cards." },
];

const BOARD_OPTIONS = [
  { value: "planning", label: "Planning Board" },
  { value: "zoning", label: "Zoning Board of Adjustment" },
  { value: "council", label: "Township Council" },
];

const DAY_OPTIONS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

export default function Settings() {
  const router = useRouter();
  const [account, setAccount] = useState(null);
  const [emailSettings, setEmailSettings] = useState({ frequency: "weekly", board_types: ["planning","zoning","council"], send_day: "monday" });
  const [nameForm, setNameForm] = useState({ name: "", company: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [status, setStatus] = useState(null);
  const [nameStatus, setNameStatus] = useState(null);

  async function load() {
    const r = await fetch("/api/pro/account");
    if (r.status === 401) { router.replace("/login"); return; }
    const d = await r.json();
    setAccount(d.account);
    setNameForm({ name: d.account?.name || "", company: d.account?.company || "" });
    if (d.settings) setEmailSettings(d.settings);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function logout() {
    await fetch("/api/pro/logout", { method: "POST" });
    router.replace("/login");
  }

  function toggleBoard(val) {
    setEmailSettings(s => ({
      ...s,
      board_types: s.board_types.includes(val)
        ? s.board_types.filter(b => b !== val)
        : [...s.board_types, val],
    }));
  }

  async function saveEmailSettings(e) {
    e.preventDefault();
    if (emailSettings.board_types.length === 0) {
      setStatus({ type: "err", msg: "Select at least one board type." });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const r = await fetch("/api/pro/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailSettings),
      });
      const d = await r.json();
      if (!r.ok) setStatus({ type: "err", msg: d.error });
      else setStatus({ type: "ok", msg: "Email settings saved." });
    } catch {
      setStatus({ type: "err", msg: "Network error — try again." });
    }
    setSaving(false);
  }

  async function saveName(e) {
    e.preventDefault();
    setSavingName(true);
    setNameStatus(null);
    try {
      const r = await fetch("/api/pro/account", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nameForm),
      });
      const d = await r.json();
      if (!r.ok) setNameStatus({ type: "err", msg: d.error });
      else { setNameStatus({ type: "ok", msg: "Account updated." }); setAccount(a => ({ ...a, ...d.account })); }
    } catch {
      setNameStatus({ type: "err", msg: "Network error — try again." });
    }
    setSavingName(false);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg }}>
      <div style={{ fontSize: "14px", color: C.dim }}>Loading…</div>
    </div>
  );

  return (
    <>
      <Head>
        <title>Settings — Pipeline</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="layout">
        <nav className="sidebar">
          <div className="sidebar-brand"><span>Pipeline</span></div>
          <Link href="/dashboard" className="nav-item">
            <span className="nav-icon">🏠</span> Dashboard
          </Link>
          <Link href="/settings" className="nav-item active">
            <span className="nav-icon">⚙️</span> Email settings
          </Link>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={logout}><span>↩</span> Sign out</button>
          </div>
        </nav>

        <div className="main">
          <div className="topbar">
            <h1 className="page-title">Settings</h1>
          </div>
          <div className="content">

            {/* Email delivery */}
            <div className="section-mb">
              <div className="section-title">Email delivery</div>
              <div className="card">
                <form onSubmit={saveEmailSettings}>
                  <div className="field">
                    <label className="label">Digest frequency</label>
                    <div className="radio-group">
                      {FREQ_OPTIONS.map(opt => (
                        <label key={opt.value} className={`radio-opt${emailSettings.frequency === opt.value ? " selected" : ""}`}>
                          <input
                            type="radio"
                            name="frequency"
                            value={opt.value}
                            checked={emailSettings.frequency === opt.value}
                            onChange={() => setEmailSettings(s => ({ ...s, frequency: opt.value }))}
                          />
                          <div>
                            <div className="radio-label">{opt.label}</div>
                            <div className="radio-desc">{opt.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {emailSettings.frequency === "weekly" && (
                    <div className="field">
                      <label className="label">Send day</label>
                      <select
                        value={emailSettings.send_day}
                        onChange={e => setEmailSettings(s => ({ ...s, send_day: e.target.value }))}
                        style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: "8px", color: C.text, fontFamily: "inherit", fontSize: "14px", padding: "10px 14px", outline: "none", width: "100%" }}
                      >
                        {DAY_OPTIONS.map(d => (
                          <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="field">
                    <label className="label">Board types</label>
                    <div className="check-group">
                      {BOARD_OPTIONS.map(opt => (
                        <label key={opt.value} className={`check-opt${emailSettings.board_types.includes(opt.value) ? " selected" : ""}`}>
                          <input
                            type="checkbox"
                            checked={emailSettings.board_types.includes(opt.value)}
                            onChange={() => toggleBoard(opt.value)}
                          />
                          <span className="radio-label">{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="save-btn" disabled={saving}>
                    {saving ? "Saving…" : "Save email settings"}
                  </button>
                  {status && (
                    <div className={`status-msg ${status.type === "ok" ? "status-ok" : "status-err"}`}>{status.msg}</div>
                  )}
                </form>
              </div>
            </div>

            {/* Account info */}
            <div className="section-mb">
              <div className="section-title">Account</div>
              <div className="card">
                <form onSubmit={saveName}>
                  <div className="field">
                    <label className="label">Full name</label>
                    <input
                      type="text"
                      value={nameForm.name}
                      onChange={e => setNameForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Jane Smith"
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="label">Company <span style={{ color: C.faint, fontWeight: 400 }}>(optional)</span></label>
                    <input
                      type="text"
                      value={nameForm.company}
                      onChange={e => setNameForm(f => ({ ...f, company: e.target.value }))}
                      placeholder="Smith Development LLC"
                    />
                  </div>
                  <div className="field">
                    <label className="label">Email</label>
                    <input type="email" value={account?.email || ""} disabled style={{ opacity: 0.6 }} />
                  </div>
                  <button type="submit" className="save-btn" disabled={savingName}>
                    {savingName ? "Saving…" : "Save account info"}
                  </button>
                  {nameStatus && (
                    <div className={`status-msg ${nameStatus.type === "ok" ? "status-ok" : "status-err"}`}>{nameStatus.msg}</div>
                  )}
                </form>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
