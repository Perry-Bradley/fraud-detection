import { Link } from 'react-router-dom'

const FEATURES = [
  { icon: '🛡️', title: 'AI Fraud Detection', desc: 'Every payment is scored by a machine-learning model that flags anomalies and suspicious activity in real time.', tint: '#fee2e2' },
  { icon: '📱', title: 'Mobile Money Payments', desc: 'Parents pay school fees straight from their phone via MTN MoMo & Orange Money — receipts issued instantly.', tint: '#dcfce7' },
  { icon: '📊', title: 'Gradebook & Report Cards', desc: 'Record assessments, auto-compute averages and class rank, and print report cards as PDF or editable Word.', tint: '#e0e7ff' },
  { icon: '✅', title: 'Smart Attendance', desc: 'Mark the register in seconds — absences automatically alert parents by notification and SMS.', tint: '#fef3c7' },
  { icon: '🗓️', title: 'AI Timetable Generator', desc: 'Generate a conflict-free class & teacher timetable automatically with one click.', tint: '#f3e8ff' },
  { icon: '🎓', title: 'Online Admissions', desc: 'Accept applications online, review, admit, and enroll new students into the system seamlessly.', tint: '#dbeafe' },
  { icon: '🧪', title: 'Exams & Ranking', desc: 'Schedule exam sittings, enter results, and publish ranked pass/fail sheets per class.', tint: '#ccfbf1' },
  { icon: '👨‍🏫', title: 'Staff & HR', desc: 'Manage staff records, attendance and leave requests — all in one place.', tint: '#fce7f3' },
]

const ROLES = [
  { who: 'Administrators', text: 'Full oversight of finances, academics, staff and analytics.' },
  { who: 'Bursars', text: 'Record payments, track fees, and investigate flagged transactions.' },
  { who: 'Teachers', text: 'Enter grades, mark attendance, and manage their classes.' },
  { who: 'Students & Parents', text: 'Pay fees, view balances, grades and receipts from any phone.' },
]

export default function Landing() {
  return (
    <div className="landing">
      <style>{css}</style>

      {/* Nav */}
      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-logo">S</span>
          <span>SMS<b>418</b></span>
        </div>
        <nav className="lp-nav-links">
          <a href="#features">Features</a>
          <a href="#roles">Who it's for</a>
          <Link to="/login" className="btn lp-signin">Sign in</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <span className="lp-badge">⚡ AI-powered school platform</span>
          <h1 className="lp-title">
            Run your entire school<br />from <span className="lp-grad">one platform</span>
          </h1>
          <p className="lp-sub">
            Fees, payments, grades, attendance, timetables, admissions and staff —
            unified, with AI fraud detection and mobile-money payments built in.
          </p>
          <div className="lp-cta">
            <Link to="/login" className="btn lp-cta-primary">Get started →</Link>
            <a href="#features" className="btn lp-cta-ghost">See features</a>
          </div>
          <div className="lp-trust">
            <span>🔒 Bank-grade audit trail</span>
            <span>📲 MTN MoMo & Orange Money</span>
            <span>🤖 Real-time anomaly detection</span>
          </div>
        </div>
        <div className="lp-hero-glow" />
      </section>

      {/* Stats */}
      <section className="lp-stats">
        {[['8+', 'integrated modules'], ['100%', 'digital fee tracking'], ['AI', 'fraud detection'], ['24/7', 'parent access']].map(([n, l]) => (
          <div className="lp-stat" key={l}>
            <div className="lp-stat-n">{n}</div>
            <div className="lp-stat-l">{l}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="lp-section" id="features">
        <div className="lp-section-head">
          <h2 className="lp-h2">Everything your school needs</h2>
          <p className="lp-section-sub">One login. Every department. No more scattered spreadsheets.</p>
        </div>
        <div className="lp-grid">
          {FEATURES.map((f) => (
            <div className="lp-card" key={f.title}>
              <div className="lp-icon" style={{ background: f.tint }}>{f.icon}</div>
              <h3 className="lp-card-title">{f.title}</h3>
              <p className="lp-card-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="lp-section lp-roles" id="roles">
        <div className="lp-section-head">
          <h2 className="lp-h2">Built for everyone in the school</h2>
        </div>
        <div className="lp-roles-grid">
          {ROLES.map((r) => (
            <div className="lp-role" key={r.who}>
              <div className="lp-role-who">{r.who}</div>
              <div className="lp-role-text">{r.text}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="lp-band">
        <div className="lp-band-inner">
          <h2 className="lp-band-title">Ready to digitize your school?</h2>
          <p className="lp-band-sub">Sign in to the dashboard and explore the full platform.</p>
          <Link to="/login" className="btn lp-cta-primary lp-band-btn">Sign in now →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="lp-logo">S</span>
          <span>SMS<b>418</b></span>
        </div>
        <span className="lp-foot-text">© {YEAR} School Management System · Powered by AI & Mobile Money</span>
      </footer>
    </div>
  )
}

const YEAR = 2026

const css = `
.landing { background: var(--bg); color: var(--text); min-height: 100%; overflow-x: hidden; }
.landing a { text-decoration: none; }

/* Nav */
.lp-nav { display:flex; align-items:center; justify-content:space-between; max-width:1140px; margin:0 auto; padding:18px 24px; }
.lp-brand { display:flex; align-items:center; gap:10px; font-size:18px; font-weight:800; letter-spacing:-.02em; color:var(--text); }
.lp-brand b { color: var(--primary); }
.lp-logo { width:30px; height:30px; border-radius:8px; background:linear-gradient(135deg,#15803d,#22c55e); color:#fff; display:grid; place-items:center; font-weight:800; font-size:16px; box-shadow:0 4px 10px rgba(21,128,61,.3); }
.lp-nav-links { display:flex; align-items:center; gap:24px; }
.lp-nav-links a { color: var(--text-2); font-weight:600; font-size:14px; }
.lp-nav-links a:hover { color: var(--primary); }
.lp-signin { color:#fff !important; }

/* Hero */
.lp-hero { position:relative; text-align:center; padding:70px 24px 80px; overflow:hidden; }
.lp-hero-inner { position:relative; z-index:2; max-width:780px; margin:0 auto; }
.lp-hero-glow { position:absolute; top:-180px; left:50%; transform:translateX(-50%); width:760px; height:560px; background:radial-gradient(closest-side, rgba(34,197,94,.18), rgba(34,197,94,0)); z-index:1; pointer-events:none; }
.lp-badge { display:inline-block; background:var(--primary-soft); color:var(--primary); border:1px solid var(--primary-tint); padding:6px 14px; border-radius:999px; font-size:13px; font-weight:600; margin-bottom:22px; }
.lp-title { font-size:54px; line-height:1.05; font-weight:800; letter-spacing:-.03em; margin:0 0 20px; }
.lp-grad { background:linear-gradient(120deg,#15803d,#22c55e,#84cc16); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
.lp-sub { font-size:19px; line-height:1.6; color:var(--muted); max-width:620px; margin:0 auto 32px; }
.lp-cta { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; margin-bottom:34px; }
.lp-cta-primary { font-size:16px !important; padding:14px 28px !important; border-radius:10px !important; box-shadow:0 8px 20px rgba(21,128,61,.28) !important; }
.lp-cta-ghost { font-size:16px !important; padding:14px 28px !important; border-radius:10px !important; background:var(--surface) !important; color:var(--text) !important; border:1px solid var(--border-strong) !important; box-shadow:none !important; }
.lp-cta-ghost:hover { background:var(--surface-hover) !important; }
.lp-trust { display:flex; gap:26px; justify-content:center; flex-wrap:wrap; color:var(--muted); font-size:13.5px; font-weight:500; }

/* Stats */
.lp-stats { max-width:980px; margin:0 auto; padding:0 24px 10px; display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
.lp-stat { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:22px; text-align:center; box-shadow:var(--shadow-sm); }
.lp-stat-n { font-size:30px; font-weight:800; color:var(--primary); letter-spacing:-.02em; }
.lp-stat-l { font-size:13px; color:var(--muted); margin-top:4px; }

/* Sections */
.lp-section { max-width:1140px; margin:0 auto; padding:72px 24px; }
.lp-section-head { text-align:center; margin-bottom:44px; }
.lp-h2 { font-size:34px; font-weight:800; letter-spacing:-.02em; }
.lp-section-sub { color:var(--muted); font-size:17px; margin-top:10px; }
.lp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
.lp-card { background:var(--surface); border:1px solid var(--border); border-radius:16px; padding:26px 22px; transition:transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
.lp-card:hover { transform:translateY(-4px); box-shadow:var(--shadow-lg); border-color:var(--primary-tint); }
.lp-icon { width:50px; height:50px; border-radius:12px; display:grid; place-items:center; font-size:24px; margin-bottom:16px; }
.lp-card-title { font-size:16px; font-weight:700; margin-bottom:8px; }
.lp-card-desc { font-size:13.5px; line-height:1.6; color:var(--muted); }

/* Roles */
.lp-roles { background:var(--surface-2); max-width:none; }
.lp-roles-grid { max-width:1140px; margin:0 auto; display:grid; grid-template-columns:repeat(4,1fr); gap:18px; }
.lp-role { background:var(--surface); border:1px solid var(--border); border-radius:14px; padding:24px; }
.lp-role-who { font-weight:700; font-size:15px; margin-bottom:8px; color:var(--primary); }
.lp-role-text { font-size:13.5px; line-height:1.6; color:var(--muted); }

/* CTA band */
.lp-band { background:linear-gradient(135deg,#14532d,#15803d 55%,#22c55e); color:#fff; text-align:center; }
.lp-band-inner { max-width:720px; margin:0 auto; padding:72px 24px; }
.lp-band-title { font-size:34px; font-weight:800; color:#fff; letter-spacing:-.02em; }
.lp-band-sub { color:rgba(255,255,255,.85); font-size:17px; margin:12px 0 28px; }
.lp-band-btn { background:#fff !important; color:var(--primary-hover) !important; box-shadow:0 8px 24px rgba(0,0,0,.2) !important; }
.lp-band-btn:hover { background:#f0fdf4 !important; }

/* Footer */
.lp-footer { max-width:1140px; margin:0 auto; padding:28px 24px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; border-top:1px solid var(--border); }
.lp-foot-text { color:var(--muted); font-size:13px; }

/* Responsive */
@media (max-width: 900px) {
  .lp-grid, .lp-roles-grid, .lp-stats { grid-template-columns:repeat(2,1fr); }
  .lp-title { font-size:40px; }
  .lp-h2, .lp-band-title { font-size:27px; }
}
@media (max-width: 540px) {
  .lp-grid, .lp-roles-grid, .lp-stats { grid-template-columns:1fr; }
  .lp-nav-links a:not(.lp-signin) { display:none; }
  .lp-title { font-size:33px; }
  .lp-sub { font-size:16px; }
}
`
