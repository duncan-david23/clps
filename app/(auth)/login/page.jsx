'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [values, setValues] = useState({ email: '', pw: '' });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [authError, setAuthError] = useState('');

  const setField = (id) => (e) => {
    setValues((prev) => ({ ...prev, [id]: e.target.value }));
    setAuthError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) {
      return setAuthError('Enter a valid email address.');
    }
    if (values.pw.length < 1) {
      return setAuthError('Enter your password.');
    }

    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email.trim(),
      password: values.pw,
    });
    setSubmitting(false);

    if (error) {
      return setAuthError(
        error.message === 'Invalid login credentials'
          ? 'Wrong email or password. Try again.'
          : error.message
      );
    }

    router.replace('/dashboard');
    router.refresh();
  };

  return (
    <div className="reg">
      <style>{REG_STYLES}</style>

      <div className="wrap">
        {/* ===== LEFT PANEL ===== */}
        <aside className="L">
          <Link className="logo" href="/">
            Claukk<i>POS</i>
            <small>ClaukkSuite</small>
          </Link>

          <h1>
            Welcome back to <em>your till.</em>
          </h1>
          <p>Sign in to pick up right where you left off.</p>

          <ul className="pts">
            <li>
              <i>✓</i>POS, inventory and sales history
            </li>
            <li>
              <i>✓</i>Camera and USB barcode scanning
            </li>
            <li>
              <i>✓</i>Cash, Paystack and mobile money
            </li>
            <li>
              <i>✓</i>Receipts ready to print
            </li>
          </ul>

          <div className="rc">
            <div>
              <small>24-hour trial</small>
              <b>GHS 10</b>
            </div>
            <div>
              <small>30-day plan</small>
              <b>GHS 199</b>
            </div>
          </div>
        </aside>

        {/* ===== RIGHT PANEL ===== */}
        <main className="R">
          <div className="top">
            New to ClaukkPOS? <Link href="/register">Create account</Link>
          </div>

          <div className="box">
            {authError && (
              <div
                role="alert"
                style={{
                  marginBottom: 16,
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(5,7,6,.06)',
                  color: '#b91c1c',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {authError}
              </div>
            )}

            <form className="pane on" onSubmit={handleSubmit}>
              <h2>Sign in</h2>
              <p className="sub">Enter your email and password to continue.</p>

              <div className="fld">
                <label htmlFor="email">Email</label>
                <div className="in">
                  <input
                    id="email"
                    type="email"
                    placeholder="you@email.com"
                    autoComplete="email"
                    autoFocus
                    value={values.email}
                    onChange={setField('email')}
                  />
                </div>
                <div className="er" />
              </div>

              <div className="fld">
                <label htmlFor="pw">Password</label>
                <div className="in">
                  <input
                    id="pw"
                    type={showPw ? 'text' : 'password'}
                    placeholder="Your password"
                    autoComplete="current-password"
                    value={values.pw}
                    onChange={setField('pw')}
                  />
                  <button type="button" onClick={() => setShowPw((v) => !v)}>
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="er" />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '4px 0 20px',
                  fontSize: 13,
                }}
              >
                <label
                  className="chk"
                  style={{ margin: 0, alignItems: 'center' }}
                >
                  <input type="checkbox" defaultChecked />
                  <span>Keep me signed in</span>
                </label>
                <a href="#" style={{ fontSize: 13 }}>
                  Forgot password?
                </a>
              </div>

              <button className="btn" type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <i className="sp" />
                    Signing in…
                  </>
                ) : (
                  'Sign in →'
                )}
              </button>

              <p className="note">
                By signing in you agree to our <a href="#">Terms of Service</a> and{' '}
                <a href="#">Privacy Policy</a>.
              </p>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}

const REG_STYLES = `
  .reg {
    --bg:#050706;--panel:#0a0e0c;--gr:#121613;--white:#f3f5f2;--gray:#8b968f;
    --dim:#5c6560;--em:#1fae7a;--emb:#3fe0a6;--emd:#0c3626;
    --line:rgba(243,245,242,.09);--lk:rgba(5,7,6,.12);
    box-sizing:border-box;
    padding-top:env(safe-area-inset-top,0px);
    padding-bottom:env(safe-area-inset-bottom,0px);
    background:var(--white);color:var(--bg);
    font:15px/1.55 Manrope,system-ui,sans-serif;
    min-height:100vh;
  }
  .reg *, .reg *::before, .reg *::after { box-sizing: border-box; }
  .reg button, .reg input { font: inherit; color: inherit; }
  .reg button { cursor: pointer; }
  .reg a { color: var(--em); font-weight: 700; text-decoration: none; }
  .reg a:hover { text-decoration: underline; }
  .reg :focus-visible { outline: 2px solid var(--emb); outline-offset: 2px; }

  .reg .wrap {
    display: grid;
    grid-template-columns: minmax(380px, 5fr) 7fr;
    min-height: 100vh;
  }
  .reg .L {
    background: var(--bg); color: var(--white);
    padding: 40px 48px; position: relative; overflow: hidden;
    display: flex; flex-direction: column;
  }
  .reg .L::before {
    content: ""; position: absolute; inset: 0;
    background:
      repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 64px),
      repeating-linear-gradient(0deg, var(--line) 0 1px, transparent 1px 64px);
    -webkit-mask-image: radial-gradient(ellipse at 30% 70%, #000, transparent 75%);
    mask-image: radial-gradient(ellipse at 30% 70%, #000, transparent 75%);
  }
  .reg .L::after {
    content: ""; position: absolute; left: -160px; bottom: -200px;
    width: 620px; height: 620px;
    background: radial-gradient(closest-side, rgba(31,174,122,.3), transparent);
    animation: reg-glow 6s ease-in-out infinite alternate;
  }
  @keyframes reg-glow { to { transform: scale(1.2); opacity: .5; } }
  .reg .L > * { position: relative; z-index: 2; }
  .reg .logo {
    font-weight: 800; font-size: 22px; letter-spacing: -.02em; color: inherit;
  }
  .reg .logo i { font-style: normal; color: var(--emb); }
  .reg .logo small {
    display: block; font-size: 10px; font-weight: 500;
    color: var(--dim); line-height: 1;
  }
  .reg .L h1 {
    font-size: clamp(30px, 3.4vw, 44px); line-height: 1.08;
    letter-spacing: -.03em; margin: auto 0 16px;
    padding-top: 48px; font-weight: 800;
  }
  .reg .L h1 em { font-style: normal; color: var(--emb); }
  .reg .L p { color: var(--gray); margin: 0 0 28px; max-width: 420px; }
  .reg .pts { list-style: none; padding: 0; margin: 0 0 32px; }
  .reg .pts li {
    display: flex; gap: 12px; align-items: center; padding: 8px 0;
    opacity: 0; transform: translateX(-14px); animation: reg-in .6s forwards;
  }
  .reg .pts li:nth-child(2) { animation-delay: .15s; }
  .reg .pts li:nth-child(3) { animation-delay: .3s; }
  .reg .pts li:nth-child(4) { animation-delay: .45s; }
  @keyframes reg-in { to { opacity: 1; transform: none; } }
  .reg .pts i {
    width: 22px; height: 22px; border-radius: 50%;
    background: var(--emd); color: var(--emb);
    display: grid; place-items: center;
    font-style: normal; font-size: 12px; font-weight: 800; flex: none;
  }
  .reg .rc {
    border: 1px solid var(--line); border-radius: 12px;
    background: var(--panel); padding: 16px 18px;
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    max-width: 420px;
  }
  .reg .rc small { color: var(--dim); display: block; font-size: 12px; }
  .reg .rc b { font-size: 20px; letter-spacing: -.02em; }

  .reg .R { display: flex; flex-direction: column; padding: 32px 48px; }
  .reg .top {
    display: flex; justify-content: flex-end;
    color: var(--dim); font-size: 14px; gap: 6px;
  }
  .reg .box { margin: auto; width: 100%; max-width: 460px; padding: 24px 0; }
  .reg .steps {
    display: flex; gap: 8px; list-style: none;
    padding: 0; margin: 0 0 32px;
  }
  .reg .steps li { flex: 1; font-size: 12px; font-weight: 700; color: var(--gray); }
  .reg .steps li::before {
    content: ""; display: block; height: 3px; border-radius: 2px;
    background: var(--lk); margin-bottom: 8px; transition: .4s;
  }
  .reg .steps li.on { color: var(--bg); }
  .reg .steps li.on::before,
  .reg .steps li.done::before { background: var(--em); }

  .reg .pane { display: none; }
  .reg .pane.on {
    display: block;
    animation: reg-pi .45s cubic-bezier(.2, .8, .2, 1);
  }
  @keyframes reg-pi { from { opacity: 0; transform: translateX(24px); } }

  .reg h2 {
    font-size: 30px; letter-spacing: -.03em;
    margin: 0 0 6px; line-height: 1.15;
  }
  .reg .sub { color: var(--dim); margin: 0 0 24px; }

  .reg .fld { margin-bottom: 16px; }
  .reg .fld label {
    display: block; font-size: 13px; font-weight: 700; margin-bottom: 6px;
  }
  .reg .in {
    display: flex; align-items: center;
    border: 1px solid var(--lk); border-radius: 10px;
    background: transparent; transition: .15s;
  }
  .reg .in:focus-within {
    border-color: var(--em);
    box-shadow: 0 0 0 3px rgba(63, 224, 166, .25);
  }
  .reg .in input {
    flex: 1; min-width: 0; border: 0; background: none;
    padding: 12px 14px; outline: 0;
  }
  .reg .in button {
    border: 0; background: none; color: var(--dim);
    font-weight: 700; font-size: 13px; padding: 0 14px;
  }
  .reg .er { display: none; }
  .reg .hint { font-size: 12px; color: var(--dim); margin-top: 5px; }
  .reg .hint b { color: var(--em); }

  .reg .chk {
    display: flex; gap: 10px; align-items: flex-start;
    font-size: 13px; color: var(--dim); margin: 4px 0 20px;
  }
  .reg .chk input {
    accent-color: #1fae7a; width: 18px; height: 18px; margin-top: 2px;
  }

  .reg .btn {
    width: 100%; padding: 15px; border-radius: 10px;
    border: 1px solid var(--emb); background: var(--emb);
    color: var(--bg); font-weight: 800; letter-spacing: .02em;
    transition: .2s; display: flex; justify-content: center;
    align-items: center; gap: 10px;
  }
  .reg .btn:hover {
    background: var(--em); border-color: var(--em);
    transform: translateY(-1px);
  }
  .reg .btn:disabled { opacity: .7; transform: none; }

  .reg .sp {
    width: 16px; height: 16px;
    border: 2px solid var(--bg); border-right-color: transparent;
    border-radius: 50%; animation: reg-spin .7s linear infinite;
  }
  @keyframes reg-spin { to { transform: rotate(360deg); } }

  .reg .note {
    text-align: center; font-size: 12px;
    color: var(--dim); margin-top: 12px;
  }

  @media (max-width: 900px) {
    .reg .wrap { grid-template-columns: 1fr; }
    .reg .L { padding: 24px; }
    .reg .L h1 { padding-top: 24px; margin: 0 0 12px; }
    .reg .L p, .reg .rc { display: none; }
    .reg .pts { margin: 0; }
    .reg .pts li:nth-child(n+3) { display: none; }
    .reg .R { padding: 24px; }
  }

  /* Reduced motion: only disable motion-only animations. */
  @media (prefers-reduced-motion: reduce) {
    .reg .L::after,
    .reg .sp {
      animation: none !important;
    }
    .reg .pts li {
      opacity: 1;
      transform: none;
      animation: none !important;
    }
  }
`;