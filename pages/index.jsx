import Head from "next/head";
import Link from "next/link";

const C = {
  bg: "#0A0F1E", bg2: "#111827", surface: "#1B2236", border: "#2A3452",
  text: "#E8EDF5", dim: "#8A95AB", faint: "#4A546A",
  blue: "#3B82F6", blueHi: "#60A5FA", blueLo: "#1E3A5F",
  green: "#10B981",
};

const FEATURES = [
  {
    icon: "📋",
    title: "Application pipeline",
    desc: "Every pending subdivision, site plan, and variance in your target municipalities — with hearing dates, applicant names, parcel refs, and board assigned.",
  },
  {
    icon: "🔔",
    title: "Outcome alerts",
    desc: "Get notified the morning after a board meeting when an application is approved, denied, deferred, or tabled. Never learn about a project from a competitor.",
  },
  {
    icon: "📄",
    title: "Verbatim from the record",
    desc: "Every alert links to the source document — agenda, minutes, or official notice. No paraphrasing. The civic engine parses the actual PDFs nightly.",
  },
  {
    icon: "🗺️",
    title: "Multi-municipality coverage",
    desc: "Pay per township. Add Ocean County, Monmouth County, or any covered municipality. Everything your deal flow touches, in one digest.",
  },
];

const css = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:${C.bg}; color:${C.text}; font-family:'Inter',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; }

  .wrap { max-width:860px; margin:0 auto; padding:0 24px; }

  .topbar { display:flex; align-items:center; justify-content:space-between; padding:20px 0; border-bottom:1px solid ${C.border}; }
  .brand { font-size:15px; font-weight:700; letter-spacing:0.04em; }
  .brand span { color:${C.blue}; }
  .topbar-right { display:flex; align-items:center; gap:20px; }
  .topbar-link { font-size:13px; color:${C.dim}; text-decoration:none; }
  .topbar-cta { font-size:13px; font-weight:600; color:#fff; background:${C.blue}; padding:7px 18px; border-radius:7px; text-decoration:none; }

  .hero { padding:80px 0 60px; text-align:center; }
  .eyebrow { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.14em; color:${C.blue}; margin-bottom:20px; }
  .hero-title { font-family:'Playfair Display',Georgia,serif; font-size:clamp(34px,5vw,58px); font-weight:700; line-height:1.15; color:${C.text}; margin-bottom:20px; }
  .hero-title em { font-style:normal; color:${C.blueHi}; }
  .hero-sub { font-size:17px; color:${C.dim}; line-height:1.7; max-width:560px; margin:0 auto 36px; }
  .hero-actions { display:flex; align-items:center; justify-content:center; gap:14px; flex-wrap:wrap; }
  .btn-pri { display:inline-block; background:${C.blue}; color:#fff; font-size:15px; font-weight:600; padding:13px 30px; border-radius:9px; text-decoration:none; }
  .btn-sec { display:inline-block; color:${C.dim}; font-size:14px; text-decoration:none; }

  .pricing-bar { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:18px 24px; display:flex; align-items:center; justify-content:center; gap:8px; margin:40px auto 0; max-width:440px; }
  .price-tag { font-size:26px; font-weight:700; color:${C.text}; }
  .price-detail { font-size:14px; color:${C.dim}; line-height:1.4; }

  .features { padding:60px 0; display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; }
  .feat { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:22px 24px; }
  .feat-icon { font-size:24px; margin-bottom:12px; }
  .feat-title { font-size:15px; font-weight:600; margin-bottom:8px; color:${C.text}; }
  .feat-desc { font-size:13px; color:${C.dim}; line-height:1.7; }

  .who { padding:20px 0 60px; }
  .who-title { font-family:'Playfair Display',Georgia,serif; font-size:26px; color:${C.text}; margin-bottom:24px; }
  .who-list { display:flex; flex-wrap:wrap; gap:10px; }
  .who-chip { background:${C.blueLo}; color:${C.blueHi}; font-size:13px; font-weight:500; padding:6px 14px; border-radius:100px; border:1px solid ${C.border}; }

  .cta-band { background:${C.surface}; border:1px solid ${C.border}; border-radius:16px; padding:44px 36px; text-align:center; margin:20px 0 60px; }
  .cta-title { font-family:'Playfair Display',Georgia,serif; font-size:28px; color:${C.text}; margin-bottom:12px; }
  .cta-sub { font-size:15px; color:${C.dim}; margin-bottom:28px; }

  .footer { border-top:1px solid ${C.border}; padding:24px 0; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; }
  .footer-copy { font-size:12px; color:${C.faint}; }
  .footer-links { display:flex; gap:16px; }
  .footer-links a { font-size:12px; color:${C.faint}; text-decoration:none; }

  @media (max-width: 500px) {
    .hero { padding:48px 0 36px; }
    .pricing-bar { flex-direction:column; text-align:center; }
    .cta-band { padding:28px 20px; }
  }
`;

export default function Landing() {
  return (
    <>
      <Head>
        <title>Townhall Café Pro — Land-Use Intelligence for Real Estate Professionals</title>
        <meta name="description" content="Nightly civic engine data on every land-use application, hearing, and decision in New Jersey municipalities. Built for developers, attorneys, brokers, and title companies." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="wrap">
        {/* Topbar */}
        <header className="topbar">
          <div className="brand"><span>Townhall</span> Café Pro</div>
          <div className="topbar-right">
            <Link href="/login" className="topbar-link">Sign in</Link>
            <Link href="/signup" className="topbar-cta">Get started</Link>
          </div>
        </header>

        {/* Hero */}
        <section className="hero">
          <div className="eyebrow">Professional Intelligence · New Jersey</div>
          <h1 className="hero-title">
            Know every<br /><em>land-use move</em><br />before your competition does
          </h1>
          <p className="hero-sub">
            The civic engine parses planning board, zoning board, and township council records
            nightly. You get structured alerts — applications, hearings, outcomes — for every
            municipality you monitor.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn-pri">Start monitoring →</Link>
            <Link href="#how-it-works" className="btn-sec">See how it works ↓</Link>
          </div>
          <div className="pricing-bar">
            <div className="price-tag">$<span id="price">—</span>/mo</div>
            <div className="price-detail">per township monitored<br /><span style={{ color: C.text, fontSize: "12px" }}>cancel anytime</span></div>
          </div>
        </section>

        {/* Features */}
        <section className="features" id="how-it-works">
          {FEATURES.map(f => (
            <div key={f.title} className="feat">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </section>

        {/* Who it's for */}
        <section className="who">
          <h2 className="who-title">Built for the deal-side professionals</h2>
          <div className="who-list">
            {["Residential developers", "Commercial brokers", "Land-use attorneys", "Title companies", "Civil engineers", "Environmental consultants", "HOA management firms"].map(w => (
              <span key={w} className="who-chip">{w}</span>
            ))}
          </div>
        </section>

        {/* CTA band */}
        <section className="cta-band">
          <h2 className="cta-title">Ready to track the pipeline?</h2>
          <p className="cta-sub">Select your municipalities, pay monthly, cancel anytime.<br />First digest arrives within a week of signup.</p>
          <Link href="/signup" className="btn-pri">Create your account →</Link>
        </section>

        {/* Footer */}
        <footer className="footer">
          <span className="footer-copy">© {new Date().getFullYear()} Townhall Café · townhallcafe.org</span>
          <div className="footer-links">
            <a href="https://www.townhallcafe.org">Main site</a>
            <a href="mailto:thecitizenhall@gmail.com">Support</a>
          </div>
        </footer>
      </div>
    </>
  );
}
