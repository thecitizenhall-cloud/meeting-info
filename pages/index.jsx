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
    title: "Full application pipeline",
    desc: "Every pending subdivision, variance, site plan, and rezoning in your covered municipalities — hearing dates, applicant names, parcel refs, and board assigned.",
  },
  {
    icon: "📍",
    title: "Filtered to your market",
    desc: "Set your coverage radius. You see only what's within your farm area — not a firehose of every township meeting.",
  },
  {
    icon: "⚡",
    title: "Outcome alerts",
    desc: "Approved. Denied. Deferred. Get notified the morning after a board decision. Know before your competition.",
  },
  {
    icon: "🧠",
    title: "Market signal, not meeting minutes",
    desc: "Each event includes a one-sentence market implication: what this means for inventory, buyer demand, or land value in that area.",
  },
];

const EXAMPLE_CARDS = [
  {
    badge: "Approved",
    badgeColor: "#10B981",
    title: "Bellevue Estates — 118 single-family lots + 12 affordable units",
    location: "Belnair & White Road · 0.6 mi from your listings",
    signal: "118 new units approved in a submarket with limited resale inventory — expect buyer attention to shift toward existing homes near this parcel while construction progresses.",
  },
  {
    badge: "Introduced",
    badgeColor: "#3B82F6",
    title: "Zoning variance — height + density, Route 70 commercial corridor",
    location: "Route 70 & Hyson Road",
    signal: "Density variance on a Route 70 commercial parcel may signal an upzone trend spreading from the corridor — watch adjacent residential parcels.",
  },
  {
    badge: "Pending",
    badgeColor: "#8A95AB",
    title: "Shakki LLC — 9-lot subdivision + 2 stormwater basin lots",
    location: "102 Sams Road · hearing July 6",
    signal: "Nine new lots pending in an area with recent price appreciation — approval would add supply in a tightly-held block.",
  },
];

const css = `
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  html,body { background:${C.bg}; color:${C.text}; font-family:'Inter',-apple-system,sans-serif; -webkit-font-smoothing:antialiased; }

  .wrap { max-width:900px; margin:0 auto; padding:0 24px; }

  .topbar { display:flex; align-items:center; justify-content:space-between; padding:22px 0; border-bottom:1px solid ${C.border}; }
  .brand { font-size:16px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; }
  .brand span { color:${C.blue}; }
  .topbar-right { display:flex; align-items:center; gap:20px; }
  .topbar-link { font-size:13px; color:${C.dim}; text-decoration:none; }
  .topbar-cta { font-size:13px; font-weight:600; color:#fff; background:${C.blue}; padding:8px 18px; border-radius:7px; text-decoration:none; }

  .hero { padding:72px 0 48px; max-width:680px; }
  .eyebrow { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.14em; color:${C.blue}; margin-bottom:18px; }
  .hero-title { font-family:'Playfair Display',Georgia,serif; font-size:clamp(32px,4.5vw,54px); font-weight:700; line-height:1.15; color:${C.text}; margin-bottom:18px; }
  .hero-title em { font-style:normal; color:${C.blueHi}; }
  .hero-sub { font-size:16px; color:${C.dim}; line-height:1.75; margin-bottom:32px; max-width:520px; }
  .hero-actions { display:flex; align-items:center; gap:14px; flex-wrap:wrap; margin-bottom:48px; }
  .btn-pri { display:inline-block; background:${C.blue}; color:#fff; font-size:15px; font-weight:600; padding:12px 28px; border-radius:9px; text-decoration:none; }
  .btn-sec { display:inline-block; color:${C.dim}; font-size:14px; text-decoration:none; }

  /* Example cards */
  .example-section { margin-bottom:64px; }
  .example-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:${C.dim}; margin-bottom:16px; }
  .example-cards { display:flex; flex-direction:column; gap:10px; }
  .ex-card { background:${C.surface}; border:1px solid ${C.border}; border-radius:10px; padding:16px 18px; }
  .ex-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:6px; gap:12px; }
  .ex-location { font-size:11px; color:${C.dim}; }
  .ex-badge { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; padding:2px 7px; border-radius:4px; border:1px solid; white-space:nowrap; flex-shrink:0; }
  .ex-title { font-size:14px; color:${C.text}; font-weight:600; margin-bottom:8px; line-height:1.4; }
  .ex-signal { background:${C.blueLo}; border-radius:6px; padding:9px 12px; font-size:12px; color:${C.blueHi}; line-height:1.55; }
  .ex-signal strong { display:block; font-size:10px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px; opacity:0.7; }

  .features { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; margin-bottom:64px; }
  .feat { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:20px 22px; }
  .feat-icon { font-size:22px; margin-bottom:10px; }
  .feat-title { font-size:14px; font-weight:600; margin-bottom:6px; }
  .feat-desc { font-size:13px; color:${C.dim}; line-height:1.7; }

  .pricing-row { display:flex; align-items:center; gap:16px; background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:20px 24px; margin-bottom:64px; flex-wrap:wrap; }
  .price-big { font-size:28px; font-weight:700; }
  .price-detail { font-size:14px; color:${C.dim}; line-height:1.5; }

  .buyers { margin-bottom:64px; }
  .buyers-title { font-family:'Playfair Display',Georgia,serif; font-size:24px; margin-bottom:16px; }
  .buyer-chips { display:flex; flex-wrap:wrap; gap:8px; }
  .chip { background:${C.blueLo}; color:${C.blueHi}; font-size:13px; padding:6px 14px; border-radius:100px; border:1px solid ${C.border}; }

  .cta-band { background:${C.surface}; border:1px solid ${C.border}; border-radius:14px; padding:44px; text-align:center; margin-bottom:60px; }
  .cta-title { font-family:'Playfair Display',Georgia,serif; font-size:26px; margin-bottom:10px; }
  .cta-sub { font-size:15px; color:${C.dim}; margin-bottom:28px; }

  .footer { border-top:1px solid ${C.border}; padding:22px 0; display:flex; justify-content:space-between; flex-wrap:wrap; gap:12px; }
  .footer-copy { font-size:12px; color:${C.faint}; }
  .footer-links { display:flex; gap:16px; }
  .footer-links a { font-size:12px; color:${C.faint}; text-decoration:none; }

  @media(max-width:560px){
    .hero { padding:48px 0 32px; }
    .cta-band { padding:28px 20px; }
    .pricing-row { flex-direction:column; align-items:flex-start; }
  }
`;

export default function Landing() {
  const price = process.env.NEXT_PUBLIC_PRICE_DISPLAY || "—";
  return (
    <>
      <Head>
        <title>Pipeline — Land Use Intelligence for NJ Real Estate</title>
        <meta name="description" content="Early warning for property-level change. Pipeline monitors NJ planning boards, zoning boards, and councils and delivers filtered, market-relevant intelligence to real estate professionals." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@400;600;700&display=swap" rel="stylesheet" />
      </Head>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div className="wrap">
        <header className="topbar">
          <div className="brand"><span>Pipeline</span></div>
          <div className="topbar-right">
            <Link href="/login" className="topbar-link">Sign in</Link>
            <Link href="/signup" className="topbar-cta">Get started</Link>
          </div>
        </header>

        <section className="hero">
          <div className="eyebrow">Land Use Intelligence · New Jersey</div>
          <h1 className="hero-title">
            Know what changed<br />near your listings<br /><em>before anyone else</em>
          </h1>
          <p className="hero-sub">
            Pipeline monitors every planning board, zoning board, and council meeting in your coverage area.
            You get filtered, market-relevant alerts — not a municipal digest, but an early warning system for property-level change.
          </p>
          <div className="hero-actions">
            <Link href="/signup" className="btn-pri">Start monitoring →</Link>
            <Link href="#how-it-works" className="btn-sec">See an example ↓</Link>
          </div>
        </section>

        {/* Example output */}
        <section className="example-section" id="how-it-works">
          <div className="example-label">This week in your market</div>
          <div className="example-cards">
            {EXAMPLE_CARDS.map(c => (
              <div key={c.title} className="ex-card">
                <div className="ex-top">
                  <span className="ex-location">{c.location}</span>
                  <span className="ex-badge" style={{ color: c.badgeColor, borderColor: c.badgeColor }}>{c.badge}</span>
                </div>
                <div className="ex-title">{c.title}</div>
                <div className="ex-signal">
                  <strong>Market signal</strong>
                  {c.signal}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="features">
          {FEATURES.map(f => (
            <div key={f.title} className="feat">
              <div className="feat-icon">{f.icon}</div>
              <div className="feat-title">{f.title}</div>
              <div className="feat-desc">{f.desc}</div>
            </div>
          ))}
        </section>

        {/* Pricing */}
        <div className="pricing-row">
          <div className="price-big">{price}<span style={{ fontSize: "16px", fontWeight: 400, color: C.dim }}>/mo</span></div>
          <div className="price-detail">per township monitored · set your coverage radius · cancel anytime</div>
          <Link href="/signup" className="btn-pri" style={{ marginLeft: "auto" }}>Get started →</Link>
        </div>

        {/* Buyers */}
        <section className="buyers">
          <h2 className="buyers-title">Built for deal-side professionals</h2>
          <div className="buyer-chips">
            {["Residential developers","Commercial brokers","Land-use attorneys","Title companies","Civil engineers","Environmental consultants","Investor groups","HOA management"].map(b => (
              <span key={b} className="chip">{b}</span>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <h2 className="cta-title">Ready to watch your market?</h2>
          <p className="cta-sub">Select your townships, set your coverage radius, get your first alert within a week.</p>
          <Link href="/signup" className="btn-pri">Create your account →</Link>
        </section>

        <footer className="footer">
          <span className="footer-copy">© {new Date().getFullYear()} Pipeline · landusealert.com</span>
          <div className="footer-links">
            <a href="mailto:alerts@landusealert.com">Support</a>
          </div>
        </footer>
      </div>
    </>
  );
}
