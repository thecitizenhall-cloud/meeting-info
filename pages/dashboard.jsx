import Head from "next/head";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const C = {
  bg: "#0A0F1E", bg2: "#111827", surface: "#1B2236", border: "#2A3452",
  text: "#E8EDF5", dim: "#8A95AB", faint: "#4A546A",
  blue: "#3B82F6", blueHi: "#60A5FA", blueLo: "#1E3A5F",
  green: "#10B981", red: "#EF4444", amber: "#F59E0B",
};

const STATUS_LABELS = {
  active: { label: "Active", color: C.green },
  past_due: { label: "Past due", color: C.amber },
  pending: { label: "Pending", color: C.dim },
  canceled: { label: "Canceled", color: C.red },
};

const AVAILABLE_MUNICIPALITIES = [
  { key: "jackson_nj", name: "Jackson Township, Ocean County NJ" },
  { key: "lakewood_nj", name: "Lakewood Township, Ocean County NJ" },
];

const css = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:${C.bg}; color:${C.text}; font-family:'Inter',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; min-height:100vh; }
  a { color:inherit; text-decoration:none; }

  .layout { display:flex; min-height:100vh; }

  /* Sidebar */
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

  /* Main */
  .main { flex:1; overflow-x:auto; }
  .topbar { display:flex; align-items:center; justify-content:space-between; padding:20px 32px; border-bottom:1px solid ${C.border}; }
  .page-title { font-family:'Playfair Display',Georgia,serif; font-size:22px; color:${C.text}; }
  .acct-badge { font-size:12px; color:${C.dim}; display:flex; align-items:center; gap:8px; }
  .status-dot { width:7px; height:7px; border-radius:50%; }

  .content { padding:32px; max-width:900px; }

  /* Welcome banner */
  .welcome-banner { background:${C.blueLo}; border:1px solid ${C.border}; border-radius:12px; padding:18px 22px; margin-bottom:28px; display:flex; justify-content:space-between; align-items:center; gap:16px; }
  .welcome-text { font-size:14px; color:${C.text}; line-height:1.5; }
  .dismiss-btn { background:none; border:none; font-size:18px; color:${C.dim}; cursor:pointer; flex-shrink:0; padding:0; }

  /* Section */
  .section-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
  .section-title { font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:${C.dim}; }
  .section-mb { margin-bottom:32px; }

  /* Township cards */
  .township-list { display:flex; flex-direction:column; gap:10px; }
  .township-row { background:${C.surface}; border:1px solid ${C.border}; border-radius:10px; padding:14px 18px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .township-name { font-size:15px; color:${C.text}; font-weight:500; }
  .township-actions { display:flex; align-items:center; gap:10px; }
  .remove-btn { background:none; border:1px solid ${C.border}; border-radius:6px; font-size:12px; color:${C.dim}; padding:4px 10px; cursor:pointer; font-family:inherit; transition:border-color 0.12s; }
  .remove-btn:hover { border-color:${C.red}; color:${C.red}; }

  .add-btn { background:${C.surface}; border:1px dashed ${C.border}; border-radius:10px; padding:14px 18px; font-size:14px; color:${C.dim}; cursor:pointer; text-align:center; font-family:inherit; transition:border-color 0.12s; width:100%; }
  .add-btn:hover { border-color:${C.blue}; color:${C.text}; }

  /* Add township modal */
  .modal-backdrop { position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:100; padding:20px; }
  .modal { background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:28px; width:100%; max-width:420px; }
  .modal-title { font-size:17px; font-weight:600; color:${C.text}; margin-bottom:16px; }
  .modal-opt { display:flex; align-items:flex-start; gap:12px; background:${C.bg2}; border:1px solid ${C.border}; border-radius:9px; padding:12px 14px; cursor:pointer; transition:border-color 0.12s; margin-bottom:8px; }
  .modal-opt.selected { border-color:${C.blue}; background:${C.blueLo}; }
  .modal-opt input { width:15px; height:15px; flex-shrink:0; margin-top:2px; accent-color:${C.blue}; }
  .modal-opt-name { font-size:14px; color:${C.text}; }
  .modal-actions { display:flex; gap:10px; margin-top:18px; }
  .modal-cancel { flex:1; background:none; border:1px solid ${C.border}; border-radius:8px; color:${C.dim}; padding:10px; font-family:inherit; font-size:14px; cursor:pointer; }
  .modal-confirm { flex:1; background:${C.blue}; color:#fff; border:none; border-radius:8px; padding:10px; font-family:inherit; font-size:14px; font-weight:600; cursor:pointer; }
  .modal-confirm:disabled { opacity:0.5; cursor:not-allowed; }

  /* Billing card */
  .billing-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:18px 22px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
  .billing-info { font-size:14px; color:${C.dim}; }
  .billing-info strong { color:${C.text}; display:block; margin-bottom:4px; font-size:15px; }
  .portal-btn { background:${C.surface}; border:1px solid ${C.border}; color:${C.text}; border-radius:8px; padding:9px 18px; font-size:13px; font-weight:600; cursor:pointer; font-family:inherit; white-space:nowrap; transition:border-color 0.12s; }
  .portal-btn:hover { border-color:${C.blue}; }

  /* Loading */
  .loading { display:flex; align-items:center; justify-content:center; min-height:200px; color:${C.dim}; font-size:14px; }

  @keyframes spin { to { transform:rotate(360deg); } }
  .spinner { width:18px; height:18px; border:2px solid rgba(255,255,255,0.2); border-top-color:${C.blue}; border-radius:50%; animation:spin 0.7s linear infinite; display:inline-block; }

  /* Responsive */
  @media (max-width:680px) {
    .layout { flex-direction:column; }
    .sidebar { width:100%; border-right:none; border-bottom:1px solid ${C.border}; flex-direction:row; flex-wrap:wrap; padding:12px; }
    .sidebar-brand { margin-bottom:0; }
    .sidebar-footer { margin-top:0; }
    .content { padding:20px; }
    .topbar { padding:16px 20px; }
  }
`;

export default function Dashboard() {
  const router = useRouter();
  const { welcome } = router.query;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSelection, setAddSelection] = useState([]);
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(null);
  const [portalLoading, setPortalLoading] = useState(false);

  async function load() {
    try {
      const r = await fetch("/api/pro/account");
      if (r.status === 401) { router.replace("/login"); return; }
      const d = await r.json();
      setData(d);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    load();
    if (welcome === "1") setShowWelcome(true);
  }, []);

  async function logout() {
    await fetch("/api/pro/logout", { method: "POST" });
    router.replace("/login");
  }

  async function openPortal() {
    setPortalLoading(true);
    try {
      const r = await fetch("/api/pro/portal", { method: "POST" });
      const d = await r.json();
      if (d.url) window.location.href = d.url;
    } catch {}
    setPortalLoading(false);
  }

  async function addTownships() {
    if (addSelection.length === 0) return;
    setAddLoading(true);
    try {
      for (const muni of addSelection) {
        await fetch("/api/pro/townships", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: muni.key, name: muni.name }),
        });
      }
      await load();
      setShowAddModal(false);
      setAddSelection([]);
    } catch {}
    setAddLoading(false);
  }

  async function removeTownship(key) {
    setRemoveLoading(key);
    try {
      await fetch("/api/pro/townships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await load();
    } catch {}
    setRemoveLoading(null);
  }

  const activeTownships = data?.townships?.filter(t => t.active) || [];
  const availableToAdd = AVAILABLE_MUNICIPALITIES.filter(m => !activeTownships.find(t => t.municipality_key === m.key));
  const statusInfo = STATUS_LABELS[data?.account?.status] || STATUS_LABELS.pending;

  return (
    <>
      <Head>
        <title>Dashboard — Pipeline</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="layout">
        {/* Sidebar */}
        <nav className="sidebar">
          <div className="sidebar-brand"><span>Pipeline</span></div>
          <Link href="/dashboard" className="nav-item active">
            <span className="nav-icon">🏠</span> Dashboard
          </Link>
          <Link href="/settings" className="nav-item">
            <span className="nav-icon">⚙️</span> Settings
          </Link>
          <div className="sidebar-footer">
            <button className="logout-btn" onClick={logout}>
              <span>↩</span> Sign out
            </button>
          </div>
        </nav>

        {/* Main */}
        <div className="main">
          <div className="topbar">
            <h1 className="page-title">Dashboard</h1>
            {data && (
              <div className="acct-badge">
                <span className="status-dot" style={{ background: statusInfo.color }} />
                <span>{data.account?.name}</span>
                <span style={{ color: statusInfo.color }}>· {statusInfo.label}</span>
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading"><span className="spinner" /></div>
          ) : (
            <div className="content">
              {showWelcome && (
                <div className="welcome-banner">
                  <div className="welcome-text">
                    <strong style={{ display: "block", marginBottom: "4px" }}>Welcome, {data?.account?.name?.split(" ")[0]}!</strong>
                    Your account is active. Your first Pipeline digest arrives on your next scheduled send. Set your coverage radius in Settings to filter alerts to your market area.
                  </div>
                  <button className="dismiss-btn" onClick={() => setShowWelcome(false)}>×</button>
                </div>
              )}

              {/* Townships */}
              <div className="section-mb">
                <div className="section-header">
                  <span className="section-title">Monitored townships</span>
                  <span style={{ fontSize: "12px", color: C.dim }}>{activeTownships.length} active</span>
                </div>
                <div className="township-list">
                  {activeTownships.map(t => (
                    <div key={t.id} className="township-row">
                      <span className="township-name">{t.municipality_name}</span>
                      <div className="township-actions">
                        <button
                          className="remove-btn"
                          onClick={() => removeTownship(t.municipality_key)}
                          disabled={removeLoading === t.municipality_key}
                        >
                          {removeLoading === t.municipality_key ? "Removing…" : "Remove"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {availableToAdd.length > 0 && (
                    <button className="add-btn" onClick={() => setShowAddModal(true)}>
                      + Add a township
                    </button>
                  )}
                </div>
              </div>

              {/* Billing */}
              <div className="section-mb">
                <div className="section-header">
                  <span className="section-title">Billing</span>
                </div>
                <div className="billing-card">
                  <div className="billing-info">
                    <strong>Subscription</strong>
                    {activeTownships.length} township{activeTownships.length !== 1 ? "s" : ""} monitored ·
                    {" "}<span style={{ color: statusInfo.color }}>{statusInfo.label}</span>
                  </div>
                  <button className="portal-btn" onClick={openPortal} disabled={portalLoading}>
                    {portalLoading ? "Opening…" : "Manage billing →"}
                  </button>
                </div>
              </div>

              {/* Account */}
              <div className="section-mb">
                <div className="section-header">
                  <span className="section-title">Account</span>
                </div>
                <div className="billing-card">
                  <div className="billing-info">
                    <strong>{data?.account?.name}</strong>
                    {data?.account?.company && <span>{data.account.company} · </span>}
                    {data?.account?.email}
                  </div>
                  <Link href="/settings" style={{ fontSize: "13px", color: C.blueHi }}>Edit settings →</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add township modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal">
            <div className="modal-title">Add a township</div>
            {availableToAdd.map(muni => {
              const sel = addSelection.some(m => m.key === muni.key);
              return (
                <label key={muni.key} className={`modal-opt${sel ? " selected" : ""}`}>
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => setAddSelection(prev =>
                      sel ? prev.filter(m => m.key !== muni.key) : [...prev, muni]
                    )}
                  />
                  <span className="modal-opt-name">{muni.name}</span>
                </label>
              );
            })}
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => { setShowAddModal(false); setAddSelection([]); }}>Cancel</button>
              <button className="modal-confirm" onClick={addTownships} disabled={addSelection.length === 0 || addLoading}>
                {addLoading ? "Adding…" : `Add ${addSelection.length || ""} township${addSelection.length !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
