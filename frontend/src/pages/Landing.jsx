import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

/* Minimal line icons (stroke = currentColor, no fills, no emojis). */
const ICONS = {
  shield: <><path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z" /><path d="M9 12l2 2 4-4.5" /></>,
  card: <><rect x="3" y="6" width="18" height="12" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /><line x1="7" y1="14" x2="11" y2="14" /></>,
  book: <><path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z" /><path d="M9 8h6M9 12h6" /></>,
  check: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12l3 3 5-6" /></>,
  calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="16" y1="2" x2="16" y2="6" /></>,
  inbox: <><path d="M3 13h5l2 3h4l2-3h5" /><path d="M5 6l-2 7v5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5l-2-7z" /></>,
}

const Icon = ({ name }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {ICONS[name]}
  </svg>
)

const FEATURES = [
  { icon: 'shield', title: 'Fraud detection', desc: 'A machine-learning model scores every payment and flags anomalies the moment they happen.' },
  { icon: 'card', title: 'Mobile money', desc: 'Parents settle fees from their phone via MTN MoMo and Orange Money. Receipts issue automatically.' },
  { icon: 'book', title: 'Grades & reports', desc: 'Record assessments, compute averages and rank, and print report cards as PDF or editable Word.' },
  { icon: 'check', title: 'Attendance', desc: 'Mark the register in seconds. Absences notify parents the same day, by app and SMS.' },
  { icon: 'calendar', title: 'Timetabling', desc: 'Generate a conflict-free class and teacher timetable automatically, then adjust by hand.' },
  { icon: 'inbox', title: 'Admissions', desc: 'Take applications online, review them, and enroll new students without paperwork.' },
]

const CLASSES = ['Form 1', 'Form 2', 'Form 3', 'Form 4', 'Form 5', 'Lower Sixth', 'Upper Sixth']

export default function Landing() {
  return (
    <div className="lp">
      <style>{css}</style>

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-in">
          <div className="lp-brand">SMS<span>418</span></div>
          <nav>
            <a href="#features">Features</a>
            <a href="#who">Who it's for</a>
            <a href="#apply">Apply</a>
            <Link to="/login" className="lp-nav-cta">Sign in</Link>
          </nav>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-wrap">
          <div className="lp-eyebrow"><span className="lp-dot" /> School management system</div>
          <h1 className="lp-title">
            Everything your school runs on,<br />in a single system.
          </h1>
          <p className="lp-lede">
            Fees, payments, grades, attendance, timetables and admissions —
            one record for every student, with fraud detection and mobile-money
            payments built in.
          </p>
          <div className="lp-actions">
            <Link to="/login" className="lp-btn">Sign in</Link>
            <a href="#features" className="lp-link">See what's inside &rarr;</a>
          </div>
          <div className="lp-meta">One login for administrators, bursars, teachers and parents.</div>
        </div>
      </section>

      <section className="lp-features" id="features">
        <div className="lp-wrap">
          <div className="lp-kicker">Capabilities</div>
          <div className="lp-grid">
            {FEATURES.map((f) => (
              <div className="lp-feat" key={f.title}>
                <span className="lp-feat-icon"><Icon name={f.icon} /></span>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-who" id="who">
        <div className="lp-wrap lp-who-in">
          <div className="lp-who-head">
            <div className="lp-kicker">Built for the whole school</div>
            <h2>One platform, every role.</h2>
          </div>
          <ul className="lp-who-list">
            <li><b>Administrators</b><span>Oversight of finance, academics, staff and analytics.</span></li>
            <li><b>Bursars</b><span>Record payments, track fees, investigate flagged transactions.</span></li>
            <li><b>Teachers</b><span>Enter grades, mark attendance, manage their classes.</span></li>
            <li><b>Students &amp; parents</b><span>Pay fees and view balances, grades and receipts.</span></li>
          </ul>
        </div>
      </section>

      <section className="lp-apply" id="apply">
        <div className="lp-wrap">
          <div className="lp-kicker">Admissions</div>
          <div className="lp-apply-in">
            <div className="lp-apply-copy">
              <h2>Apply for admission</h2>
              <p>
                Fill in the short form and we'll review your application.
                You'll receive a reference number straight away — keep it to
                track your application status.
              </p>
              <ul className="lp-apply-steps">
                <li><span>1</span> Submit the form below</li>
                <li><span>2</span> We review &amp; contact you</li>
                <li><span>3</span> Receive your admission letter</li>
                <li><span>4</span> Enroll and pay fees online</li>
              </ul>
            </div>
            <div className="lp-apply-form-wrap">
              <AdmissionForm />
            </div>
          </div>
        </div>
      </section>

      <section className="lp-cta">
        <div className="lp-wrap lp-cta-in">
          <h2>Bring your school online.</h2>
          <Link to="/login" className="lp-btn">Sign in</Link>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-wrap lp-foot-in">
          <div className="lp-brand">SMS<span>418</span></div>
          <span>&copy; {YEAR} School Management System</span>
        </div>
      </footer>
    </div>
  )
}

function AdmissionForm() {
  const STEPS = ['Applicant', 'Guardian', 'Review']
  const [step, setStep] = useState(0)
  const [f, setF] = useState({
    applicant_name: '', date_of_birth: '', gender: '', desired_class: '', previous_school: '',
    guardian_name: '', guardian_phone: '', guardian_email: '', notes: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [done, setDone] = useState(null)

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  async function submit() {
    setBusy(true); setErr(null)
    try {
      const { data } = await axios.post(`${API_URL}/applications/`, f)
      setDone(data)
    } catch (ex) {
      const msg = ex.response?.data
      setErr(typeof msg === 'string' ? msg : Object.values(msg || {}).flat().join(' ') || 'Submission failed.')
    } finally { setBusy(false) }
  }

  if (done) {
    return (
      <div className="lp-form-card lp-form-success">
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
        <h3>Application submitted!</h3>
        <p>Your reference number is:</p>
        <div className="lp-ref">{done.reference}</div>
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>
          Save this reference — you can use it to follow up on your application.
          We'll be in touch soon.
        </p>
      </div>
    )
  }

  return (
    <div className="lp-form-card">
      {/* Step indicators */}
      <div className="lp-steps">
        {STEPS.map((s, i) => (
          <div key={s} className={`lp-step ${i === step ? 'active' : i < step ? 'done' : ''}`}>
            <span>{i < step ? '✓' : i + 1}</span>{s}
          </div>
        ))}
      </div>

      {step === 0 && (
        <>
          <h3 className="lp-form-heading">Applicant details</h3>
          <div className="lp-field">
            <label>Full name <span className="req">*</span></label>
            <input value={f.applicant_name} onChange={set('applicant_name')} placeholder="e.g. Njoku Emmanuel" />
          </div>
          <div className="lp-row">
            <div className="lp-field">
              <label>Date of birth</label>
              <input type="date" value={f.date_of_birth} onChange={set('date_of_birth')} />
            </div>
            <div className="lp-field">
              <label>Gender</label>
              <select value={f.gender} onChange={set('gender')}>
                <option value="">— select —</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
              </select>
            </div>
          </div>
          <div className="lp-row">
            <div className="lp-field">
              <label>Class applying for <span className="req">*</span></label>
              <select value={f.desired_class} onChange={set('desired_class')}>
                <option value="">— select —</option>
                {CLASSES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="lp-field">
              <label>Previous school</label>
              <input value={f.previous_school} onChange={set('previous_school')} placeholder="Optional" />
            </div>
          </div>
          <button
            className="lp-btn" style={{ width: '100%', marginTop: 8, textAlign: 'center' }}
            onClick={() => {
              if (!f.applicant_name.trim() || !f.desired_class) { setErr('Full name and class are required.'); return }
              setErr(null); setStep(1)
            }}
          >
            Next: Guardian details →
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <h3 className="lp-form-heading">Parent / Guardian details</h3>
          <div className="lp-field">
            <label>Guardian full name <span className="req">*</span></label>
            <input value={f.guardian_name} onChange={set('guardian_name')} placeholder="e.g. Njoku Peter" />
          </div>
          <div className="lp-row">
            <div className="lp-field">
              <label>Phone number <span className="req">*</span></label>
              <input type="tel" value={f.guardian_phone} onChange={set('guardian_phone')} placeholder="6XXXXXXXX" />
            </div>
            <div className="lp-field">
              <label>Email (optional)</label>
              <input type="email" value={f.guardian_email} onChange={set('guardian_email')} placeholder="email@example.com" />
            </div>
          </div>
          <div className="lp-field">
            <label>Additional notes</label>
            <textarea rows="2" value={f.notes} onChange={set('notes')} placeholder="Anything else we should know..." />
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="lp-btn-ghost" onClick={() => { setErr(null); setStep(0) }}>← Back</button>
            <button
              className="lp-btn" style={{ flex: 1, textAlign: 'center' }}
              onClick={() => {
                if (!f.guardian_name.trim() || !f.guardian_phone.trim()) { setErr('Guardian name and phone are required.'); return }
                setErr(null); setStep(2)
              }}
            >
              Review application →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <h3 className="lp-form-heading">Review &amp; submit</h3>
          <div className="lp-review">
            <div><span>Applicant</span><strong>{f.applicant_name}</strong></div>
            <div><span>Class</span><strong>{f.desired_class}</strong></div>
            {f.date_of_birth && <div><span>Date of birth</span><strong>{f.date_of_birth}</strong></div>}
            {f.gender && <div><span>Gender</span><strong>{f.gender === 'M' ? 'Male' : 'Female'}</strong></div>}
            {f.previous_school && <div><span>Previous school</span><strong>{f.previous_school}</strong></div>}
            <div><span>Guardian</span><strong>{f.guardian_name}</strong></div>
            <div><span>Phone</span><strong>{f.guardian_phone}</strong></div>
            {f.guardian_email && <div><span>Email</span><strong>{f.guardian_email}</strong></div>}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="lp-btn-ghost" onClick={() => { setErr(null); setStep(1) }}>← Edit</button>
            <button
              className="lp-btn" style={{ flex: 1, textAlign: 'center' }}
              disabled={busy}
              onClick={submit}
            >
              {busy ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        </>
      )}

      {err && <div className="lp-form-err">{err}</div>}
    </div>
  )
}

const YEAR = 2026

const css = `
.lp { background:#fff; color:#1c1917; }
.lp-wrap { max-width:1040px; margin:0 auto; padding:0 28px; }

/* Nav */
.lp-nav { border-bottom:1px solid var(--border); position:sticky; top:0; background:rgba(255,255,255,.85); backdrop-filter:saturate(180%) blur(8px); z-index:10; }
.lp-nav-in { display:flex; align-items:center; justify-content:space-between; height:64px; }
.lp-brand { font-weight:700; font-size:17px; letter-spacing:-.01em; }
.lp-brand span { color:var(--primary); }
.lp-nav nav { display:flex; align-items:center; gap:30px; }
.lp-nav nav a { color:var(--text-2); font-weight:500; font-size:14px; text-decoration:none; }
.lp-nav nav a:hover { color:var(--text); }
.lp-nav-cta { color:var(--primary) !important; font-weight:600 !important; }

/* Hero */
.lp-hero { padding:118px 0 104px; border-bottom:1px solid var(--border); }
.lp-eyebrow { display:inline-flex; align-items:center; gap:9px; font-size:12px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-bottom:30px; }
.lp-dot { width:7px; height:7px; border-radius:50%; background:var(--primary); display:inline-block; }
.lp-title { font-family:Georgia,'Iowan Old Style','Times New Roman',serif; font-weight:600; font-size:clamp(38px,6vw,62px); line-height:1.08; letter-spacing:-.02em; color:#1c1917; margin:0 0 26px; }
.lp-lede { font-size:19px; line-height:1.65; color:var(--text-2); max-width:600px; margin:0 0 38px; }
.lp-actions { display:flex; align-items:center; gap:26px; flex-wrap:wrap; }
.lp-btn { background:var(--primary); color:#fff; font-weight:600; font-size:15px; padding:12px 26px; border-radius:8px; text-decoration:none; transition:background .15s ease; }
.lp-btn:hover { background:var(--primary-hover); color:#fff; text-decoration:none; }
.lp-link { color:var(--text); font-weight:500; font-size:15px; text-decoration:none; border-bottom:1px solid var(--border-strong); padding-bottom:2px; }
.lp-link:hover { color:var(--primary); border-color:var(--primary); text-decoration:none; }
.lp-meta { margin-top:46px; font-size:14px; color:var(--muted); }

/* Features */
.lp-features { padding:96px 0; }
.lp-kicker { font-size:12px; font-weight:600; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin-bottom:46px; }
.lp-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--border); border:1px solid var(--border); }
.lp-feat { background:#fff; padding:36px 32px; }
.lp-feat-icon { display:inline-flex; color:var(--primary); margin-bottom:18px; }
.lp-feat h3 { font-size:16px; font-weight:650; margin:0 0 9px; color:#1c1917; }
.lp-feat p { font-size:14px; line-height:1.65; color:var(--muted); margin:0; }

/* Who */
.lp-who { border-top:1px solid var(--border); border-bottom:1px solid var(--border); background:var(--surface-2); }
.lp-who-in { display:grid; grid-template-columns:1fr 1.3fr; gap:60px; padding:90px 28px; align-items:start; }
.lp-who-head h2 { font-family:Georgia,'Iowan Old Style',serif; font-weight:600; font-size:30px; letter-spacing:-.015em; line-height:1.2; }
.lp-who-list { list-style:none; margin:0; padding:0; }
.lp-who-list li { display:grid; grid-template-columns:200px 1fr; gap:20px; padding:20px 0; border-top:1px solid var(--border); font-size:15px; }
.lp-who-list li:first-child { border-top:0; }
.lp-who-list b { font-weight:650; }
.lp-who-list span { color:var(--muted); line-height:1.6; }

/* CTA */
.lp-cta { padding:104px 0; }
.lp-cta-in { display:flex; align-items:center; justify-content:space-between; gap:24px; flex-wrap:wrap; }
.lp-cta h2 { font-family:Georgia,'Iowan Old Style',serif; font-weight:600; font-size:34px; letter-spacing:-.015em; margin:0; }

/* Apply section */
.lp-apply { padding:96px 0; border-top:1px solid var(--border); }
.lp-apply-in { display:grid; grid-template-columns:1fr 1.1fr; gap:64px; align-items:start; margin-top:0; }
.lp-apply-copy h2 { font-family:Georgia,'Iowan Old Style',serif; font-weight:600; font-size:30px; letter-spacing:-.015em; line-height:1.2; margin:0 0 16px; }
.lp-apply-copy p { font-size:15px; line-height:1.7; color:var(--muted); margin:0 0 28px; }
.lp-apply-steps { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:14px; }
.lp-apply-steps li { display:flex; align-items:center; gap:14px; font-size:14px; color:var(--text-2); }
.lp-apply-steps li span { width:26px; height:26px; border-radius:50%; background:var(--primary); color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

/* Form card */
.lp-form-card { background:#fff; border:1px solid var(--border); border-radius:12px; padding:28px; box-shadow:0 2px 8px rgba(0,0,0,.06); }
.lp-form-heading { font-size:16px; font-weight:650; margin:0 0 18px; }
.lp-steps { display:flex; gap:0; margin-bottom:24px; border-bottom:1px solid var(--border); padding-bottom:16px; }
.lp-step { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:500; color:var(--muted); flex:1; }
.lp-step span { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; }
.lp-step.active { color:var(--primary); }
.lp-step.active span { border-color:var(--primary); color:var(--primary); background:color-mix(in srgb, var(--primary) 10%, transparent); }
.lp-step.done { color:var(--success); }
.lp-step.done span { border-color:var(--success); color:var(--success); background:color-mix(in srgb, var(--success) 10%, transparent); }

.lp-field { display:flex; flex-direction:column; gap:5px; margin-bottom:14px; }
.lp-field label { font-size:12px; font-weight:600; color:var(--text-2); }
.lp-field input, .lp-field select, .lp-field textarea { padding:8px 10px; border:1px solid var(--border); border-radius:6px; font-size:14px; background:#fff; color:var(--text); font-family:inherit; width:100%; box-sizing:border-box; }
.lp-field input:focus, .lp-field select:focus, .lp-field textarea:focus { outline:none; border-color:var(--primary); box-shadow:0 0 0 3px color-mix(in srgb, var(--primary) 15%, transparent); }
.lp-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.req { color:var(--danger); }

.lp-btn-ghost { background:transparent; border:1px solid var(--border); color:var(--text-2); font-size:14px; font-weight:500; padding:10px 16px; border-radius:8px; cursor:pointer; transition:background .15s; }
.lp-btn-ghost:hover { background:var(--surface-2); }

.lp-review { display:flex; flex-direction:column; gap:8px; border:1px solid var(--border); border-radius:8px; padding:14px 16px; background:var(--surface-2); }
.lp-review div { display:flex; justify-content:space-between; align-items:baseline; gap:12px; font-size:14px; border-bottom:1px solid var(--border); padding-bottom:7px; }
.lp-review div:last-child { border-bottom:none; padding-bottom:0; }
.lp-review span { color:var(--muted); font-size:12px; }

.lp-form-err { margin-top:12px; padding:9px 12px; background:#fef2f2; border:1px solid #fca5a5; border-radius:6px; font-size:13px; color:#991b1b; }
.lp-form-success { text-align:center; padding:36px 24px; }
.lp-form-success h3 { font-size:20px; font-weight:700; margin:0 0 8px; }
.lp-form-success p { color:var(--muted); font-size:14px; margin:8px 0; }
.lp-ref { font-family:monospace; font-size:22px; font-weight:700; color:var(--primary); letter-spacing:.06em; margin:10px 0; padding:12px; background:color-mix(in srgb, var(--primary) 8%, transparent); border-radius:8px; }

/* Footer */
.lp-foot { border-top:1px solid var(--border); }
.lp-foot-in { display:flex; align-items:center; justify-content:space-between; height:78px; flex-wrap:wrap; gap:10px; }
.lp-foot span { color:var(--muted); font-size:13px; }

@media (max-width:820px) {
  .lp-grid { grid-template-columns:repeat(2,1fr); }
  .lp-who-in { grid-template-columns:1fr; gap:34px; padding:64px 28px; }
  .lp-who-list li { grid-template-columns:1fr; gap:4px; }
  .lp-hero { padding:80px 0 70px; }
  .lp-apply-in { grid-template-columns:1fr; gap:36px; }
  .lp-row { grid-template-columns:1fr; }
}
@media (max-width:520px) {
  .lp-grid { grid-template-columns:1fr; }
  .lp-nav nav a:not(.lp-nav-cta) { display:none; }
}
`
