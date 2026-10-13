'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

const features = [
    {
        title: 'Fast POS',
        desc: 'Search, tap, adjust, checkout. A sale takes a few clicks, and it works well on tablets.',
        icon: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
    },
    {
        title: 'Camera & USB barcode scanning',
        desc: 'Use your laptop camera, a plugged-in camera or a USB barcode scanner. Scan items straight into the cart.',
        icon: (
            <path d="M4 8V5a1 1 0 011-1h3M16 4h3a1 1 0 011 1v3M20 16v3a1 1 0 01-1 1h-3M8 20H5a1 1 0 01-1-1v-3M7 12h10" />
        ),
    },
    {
        title: 'Inventory that watches itself',
        desc: 'Stock drops with every sale, and low-stock items are flagged before you run out.',
        icon: <path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" />,
    },
    {
        title: 'Cash, Paystack and MoMo',
        desc: 'Take cash, mobile money or both on one sale. Split payments just work.',
        icon: (
            <>
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
            </>
        ),
    },
    {
        title: 'Print-ready receipts',
        desc: 'A clean receipt appears the moment payment completes, ready for your thermal printer.',
        icon: <path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" />,
    },
    {
        title: 'Reports and staff roles',
        desc: 'See revenue, top products and payments. Owners control everything, cashiers sell.',
        icon: <path d="M4 20V10M10 20V4M16 20v-8M22 20H2" />,
    },
];

const steps = [
    {
        n: '01',
        title: 'Try it for 24 hours',
        desc: 'Buy a trial pass for GHS 10 and run a real business day on ClaukkPOS.',
    },
    {
        n: '02',
        title: 'Open for business',
        desc: 'Your credit starts when you open and covers the next 24 hours. Trade as normal.',
    },
    {
        n: '03',
        title: 'Top up when you need',
        desc: 'Ready to commit? Get the 30-day plan for GHS 299.',
    },
];

const faqs = [
    {
        q: 'Do I have to pay daily?',
        a: "No. The GHS 10 pass is a 24-hour trial so you can try ClaukkPOS with real sales. When you're ready, switch to the 30-day plan.",
    },
    {
        q: 'What uses a credit?',
        a: 'A credit is one 24-hour pass. It starts when you open for business and covers the next 24 hours, so a late-night shift is not charged twice. The 30-day plan runs for 30 consecutive days from activation.',
    },
    {
        q: 'Do unused credits expire?',
        a: 'No rush. Unused credits stay in your account for 12 months.',
    },
    {
        q: 'Which payments can I accept?',
        a: 'Cash, Paystack and mobile money. You can split a single sale across cash and mobile money.',
    },
    {
        q: 'What hardware do I need?',
        a: 'A laptop or tablet with a modern browser. For scanning, use its camera, a plugged-in camera or a USB barcode scanner. A thermal printer is optional.',
    },
    {
        q: 'Can my staff use it?',
        a: "Yes. Owners have full access. Cashiers can sell, view products and take payments, but can't delete products or change critical settings.",
    },
];

const stripItems = [
    'Cash',
    'Paystack',
    'MTN MoMo',
    'Telecel Cash',
    'AT Money',
    'Split payments',
    'Camera & USB scanning',
    'Printable receipts',
];

export default function LandingUi() {
    const mockRef = useRef(null);
    const heroRef = useRef(null);
    const counterRefs = useRef([]);
    const cartRef = useRef(null);
    const totalRef = useRef(null);
    const payRef = useRef(null);
    const scanRef = useRef(null);
    const [openFaq, setOpenFaq] = useState(null);

    // Scroll reveal
    useEffect(() => {
        const io = new IntersectionObserver(
            (entries) => {
                entries.forEach((e) => {
                    if (e.isIntersecting) {
                        e.target.classList.add('in');
                        io.unobserve(e.target);
                    }
                });
            },
            { threshold: 0.15 }
        );
        document.querySelectorAll('.rv').forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, []);

    // Hero mock parallax
    useEffect(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const canHover = window.matchMedia('(hover: hover)').matches;
        if (prefersReduced || !canHover) return;

        const hero = heroRef.current;
        const mock = mockRef.current;
        if (!hero || !mock) return;

        const onMove = (e) => {
            const r = window.innerWidth / 2;
            mock.style.setProperty('--ry', `${((e.clientX - r) / r) * 5}deg`);
            mock.style.setProperty('--rx', `${8 + (e.clientY / window.innerHeight) * -3}deg`);
        };
        hero.addEventListener('mousemove', onMove);
        return () => hero.removeEventListener('mousemove', onMove);
    }, []);

    // Number counters
    useEffect(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const fmt = (n) => n.toLocaleString('en');

        counterRefs.current.forEach((el) => {
            if (!el) return;
            const n = Number(el.dataset.n);
            const p = el.dataset.p || '';
            if (prefersReduced) {
                el.textContent = p + fmt(n);
                return;
            }
            const t0 = performance.now() + 700;
            const tick = (t) => {
                const k = Math.min(1, Math.max(0, (t - t0) / 1800));
                const v = Math.round(n * (1 - Math.pow(1 - k, 3)));
                el.textContent = p + fmt(v) + (n === 24850 && k === 1 ? '.00' : '');
                if (k < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        });
    }, []);

    // Cart demo loop
    useEffect(() => {
        const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const cart = cartRef.current;
        const total = totalRef.current;
        const pay = payRef.current;
        const scan = scanRef.current;
        if (!cart || !total || !pay || !scan) return;

        const L = [
            ['Coca-Cola 500ml', 2, 8],
            ['Bread', 1, 15],
            ['Meat Pie', 1, 12],
        ];
        const mt = (v) => 'GHS ' + v.toFixed(2);
        const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

        if (prefersReduced) {
            cart.innerHTML = L.map(
                (l) =>
                    `<div class="ln"><span>${l[0]}<small>Qty ${l[1]}</small></span><b>${(
                        l[1] * l[2]
                    ).toFixed(2)}</b></div>`
            ).join('');
            total.textContent = 'GHS 43.00';
            return;
        }

        let cancelled = false;

        (async () => {
            let tot = 0;
            while (!cancelled) {
                cart.innerHTML = '';
                tot = 0;
                total.textContent = mt(0);
                pay.className = 'pay';
                pay.textContent = 'CHECKOUT';
                await sleep(1800);
                if (cancelled) return;

                for (const l of L) {
                    if (cancelled) return;
                    scan.classList.add('on');
                    await sleep(700);
                    if (cancelled) return;
                    cart.insertAdjacentHTML(
                        'beforeend',
                        `<div class="ln"><span>${l[0]}<small>Qty ${
                            l[1]
                        }</small></span><b>${(l[1] * l[2]).toFixed(2)}</b></div>`
                    );
                    const a = tot;
                    tot += l[1] * l[2];
                    const t0 = performance.now();
                    await new Promise((res) => {
                        const f = (t) => {
                            const k = Math.min(1, (t - t0) / 400);
                            total.textContent = mt(a + (tot - a) * k);
                            if (k < 1) requestAnimationFrame(f);
                            else res();
                        };
                        requestAnimationFrame(f);
                    });
                    scan.classList.remove('on');
                    await sleep(600);
                }

                if (cancelled) return;
                await sleep(500);
                pay.textContent = 'Paying with MoMo…';
                await sleep(1400);
                if (cancelled) return;
                pay.className = 'pay ok';
                pay.textContent = '✓ Payment successful';
                await sleep(3200);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const toggleFaq = (i) => setOpenFaq((prev) => (prev === i ? null : i));

    return (
        <main className="claukk">
            <style dangerouslySetInnerHTML={{ __html: styles }} />

            {/* ===== NAV ===== */}
            <nav>
                <div className="w">
                    <a href="#" className="logo">
                        Claukk<i>POS</i>
                        <small>ClaukkSuite</small>
                    </a>
                    <div className="links">
                        <a href="#features">Features</a>
                        <a href="#how">How credits work</a>
                        <a href="#pricing">Pricing</a>
                        <a href="#faq">FAQ</a>
                    </div>

                    <Link href="/register" className="btn p">
                        Get started
                    </Link>
                </div>
            </nav>

            {/* ===== HERO ===== */}
            <header className="hero" ref={heroRef}>
                <div className="w">
                    <span className="badge">
                        <i className="dot" />
                        Part of the ClaukkSuite ecosystem
                    </span>

                    <h1>
                        Sell faster. Count smarter. <em>Try it for a day.</em>
                    </h1>

                    <p className="lead">
                        ClaukkPOS is the point of sale, inventory and sales system for modern
                        retail. Scan, sell, get paid by cash or mobile money, and print the
                        receipt. Try it with a 24-hour pass, then go monthly when you&apos;re ready.
                    </p>

                    <div className="cta">
                        <Link href="/register" className="btn p">
                            Try it for GHS 10 →
                        </Link>
                        <a href="#features" className="btn">
                            See what&apos;s inside
                        </a>
                    </div>

                    <p className="fine">
                        GHS 10 for a 24-hour trial · GHS 299 for 30 days · Cash, Paystack and mobile
                        money
                    </p>

                    <div className="stage">
                        <div className="mock" id="mock" ref={mockRef}>
                            <div className="win">
                                <div className="tb">
                                    <i />
                                    <i />
                                    <i />
                                    <span>app.claukkpos.com</span>
                                </div>
                                <div className="app">
                                    <div className="sb">
                                        <b>
                                            Claukk<i>POS</i>
                                        </b>
                                        <div className="on">Dashboard</div>
                                        <div>POS</div>
                                        <div>Products</div>
                                        <div>Inventory</div>
                                        <div>Sales</div>
                                        <div>Customers</div>
                                        <div>Reports</div>
                                    </div>
                                    <div className="mn">
                                        <h4>Good morning, David.</h4>
                                        <p>
                                            Here&apos;s what&apos;s happening with your business
                                            today.
                                        </p>
                                        <div className="mm">
                                            <div>
                                                <small>TOTAL SALES</small>
                                                <b
                                                    ref={(el) => {
                                                        counterRefs.current[0] = el;
                                                    }}
                                                    data-n="24850"
                                                    data-p="GHS "
                                                >
                                                    GHS 0
                                                </b>
                                            </div>
                                            <div>
                                                <small>TRANSACTIONS</small>
                                                <b
                                                    ref={(el) => {
                                                        counterRefs.current[1] = el;
                                                    }}
                                                    data-n="248"
                                                >
                                                    0
                                                </b>
                                            </div>
                                            <div>
                                                <small>PRODUCTS SOLD</small>
                                                <b
                                                    ref={(el) => {
                                                        counterRefs.current[2] = el;
                                                    }}
                                                    data-n="684"
                                                >
                                                    0
                                                </b>
                                            </div>
                                            <div>
                                                <small>LOW STOCK</small>
                                                <b
                                                    ref={(el) => {
                                                        counterRefs.current[3] = el;
                                                    }}
                                                    data-n="12"
                                                >
                                                    0
                                                </b>
                                            </div>
                                        </div>
                                        <div className="ch">
                                            <svg
                                                viewBox="0 0 400 130"
                                                preserveAspectRatio="none"
                                            >
                                                <defs>
                                                    <linearGradient
                                                        id="claukk-g"
                                                        x1="0"
                                                        y1="0"
                                                        x2="0"
                                                        y2="1"
                                                    >
                                                        <stop
                                                            offset="0"
                                                            stopColor="#3fe0a6"
                                                            stopOpacity=".25"
                                                        />
                                                        <stop
                                                            offset="1"
                                                            stopColor="#3fe0a6"
                                                            stopOpacity="0"
                                                        />
                                                    </linearGradient>
                                                </defs>
                                                <path
                                                    className="af"
                                                    d="M0 100C40 90 60 60 100 70S160 100 200 60 270 30 310 45 370 15 400 20V130H0Z"
                                                    fill="url(#claukk-g)"
                                                />
                                                <path
                                                    className="dr"
                                                    pathLength={1}
                                                    d="M0 100C40 90 60 60 100 70S160 100 200 60 270 30 310 45 370 15 400 20"
                                                    fill="none"
                                                    stroke="#1fae7a"
                                                    strokeWidth="2.5"
                                                    vectorEffect="non-scaling-stroke"
                                                />
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="cart">
                                <h5>Current Sale</h5>
                                <div className="cl" ref={cartRef} />
                                <div className="ct">
                                    <span style={{ color: 'var(--gray)' }}>TOTAL</span>
                                    <b ref={totalRef}>GHS 0.00</b>
                                </div>
                                <div className="pay" ref={payRef}>
                                    CHECKOUT
                                </div>
                            </div>
                            <div className="scan" ref={scanRef}>
                                ▮▮ Scanned · CC500 · added
                            </div>
                        </div>
                    </div>
                </div>

                {/* marquee */}
                <div className="strip" style={{ marginTop: 0 }}>
                    <div>
                        {[...stripItems, ...stripItems].map((item, i) => (
                            <span key={i}>{item}</span>
                        ))}
                    </div>
                </div>
            </header>

            {/* ===== FEATURES ===== */}
            <section id="features">
                <div className="w">
                    <div className="rv">
                        <span className="eye">Everything you need</span>
                        <h2>Built for the till, tuned for the owner.</h2>
                        <p className="sub">
                            Every part of ClaukkPOS is designed around one question: how fast can a
                            cashier finish a sale?
                        </p>
                    </div>
                    <div className="fg rv">
                        {features.map((f) => (
                            <div className="f" key={f.title}>
                                <div className="ic">
                                    <svg viewBox="0 0 24 24">{f.icon}</svg>
                                </div>
                                <h3>{f.title}</h3>
                                <p>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== HOW ===== */}
            <section id="how" className="dk">
                <div className="w">
                    <div className="rv">
                        <span className="eye">Simple, credit-based pricing</span>
                        <h2>One credit. One business day.</h2>
                        <p className="sub">
                            No contracts and no per-sale fees from us. Try ClaukkPOS with a single
                            24-hour credit, then move to a 30-day plan when you&apos;re ready.
                        </p>
                    </div>
                    <div className="st rv">
                        {steps.map((s) => (
                            <div className="s" key={s.n}>
                                <b>{s.n}</b>
                                <h3>{s.title}</h3>
                                <p>{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== PRICING ===== */}
            <section id="pricing">
                <div className="w" style={{ textAlign: 'center' }}>
                    <div className="rv">
                        <span className="eye">Pricing</span>
                        <h2 style={{ marginInline: 'auto' }}>
                            Try it for a day. Run it for a month.
                        </h2>
                        <p className="sub" style={{ marginInline: 'auto' }}>
                            Every plan includes the full ClaukkPOS product.
                        </p>
                    </div>

                    <div className="pr rv" style={{ textAlign: 'left' }}>
                        <div className="pc">
                            <h3>24-hour trial</h3>
                            <div className="am">
                                GHS 10 <small>/ 24 hours</small>
                            </div>
                            <span
                                className="save"
                                style={{
                                    background: 'rgba(5,7,6,.06)',
                                    color: 'var(--dim)',
                                }}
                            >
                                1 credit
                            </span>
                            <ul>
                                <li>24 hours of full access to try it out</li>
                                <li>POS, products and inventory</li>
                                <li>Camera &amp; USB barcode scanning</li>
                                <li>Cash, Paystack and MoMo</li>
                                <li>Receipts, sales history and reports</li>
                            </ul>
                            <Link href="/register" className="btn d">
                                Start 24-hour trial
                            </Link>
                        </div>

                        <div className="pc hl">
                            <span className="tag">RECOMMENDED</span>
                            <h3>30 days</h3>
                            <div className="am">
                                GHS 299{' '}
                                <small style={{ color: 'var(--gray)' }}>/ 30 days</small>
                            </div>
                            <span className="save">30 days</span>
                            <ul>
                                <li>30 consecutive days of full access</li>
                                <li>Works out to about GHS 9.97 a day</li>
                                <li>Everything in the 24-hour pass</li>
                                <li>Staff accounts for owner and cashiers</li>
                                <li>Top up with more credits any time</li>
                            </ul>
                            <Link href="/register" className="btn p">
                                Buy 30 days
                            </Link>
                        </div>
                    </div>

                    <p
                        className="sub rv"
                        style={{ margin: '20px auto 0', fontSize: 14, textAlign: 'center' }}
                    >
                        The 30-day plan runs for 30 consecutive days from activation.
                    </p>
                </div>
            </section>

            {/* ===== FAQ ===== */}
            <section id="faq" style={{ paddingTop: 0 }}>
                <div className="w">
                    <div className="rv" style={{ textAlign: 'center' }}>
                        <span className="eye">FAQ</span>
                        <h2 style={{ marginInline: 'auto' }}>Good questions.</h2>
                    </div>
                    <div className="faq rv">
                        {faqs.map((f, i) => (
                            <details key={i} open={openFaq === i}>
                                <summary
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toggleFaq(i);
                                    }}
                                >
                                    {f.q}
                                </summary>
                                <p>{f.a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ===== FINAL CTA ===== */}
            <section className="fin">
                <div className="w rv">
                    <span className="eye">Ready when you are</span>
                    <h2>Open your till in minutes.</h2>
                    <p className="sub">
                        Add your products, scan your first barcode and make your first sale today.
                    </p>
                    <div className="cta">
                        <a href="#pricing" className="btn p">
                            Start your 24-hour trial →
                        </a>
                    </div>
                </div>
            </section>

            {/* ===== FOOTER ===== */}
            <footer>
                <div className="w">
                    <span
                        className="logo"
                        style={{ fontSize: 16, color: 'var(--white)' }}
                    >
                        Claukk<i>POS</i>
                    </span>
                    <span>© {new Date().getFullYear()} ClaukkSuite. All rights reserved.</span>
                </div>
            </footer>
        </main>
    );
}

const styles = `
  html { scroll-behavior: smooth; scroll-padding-top: 72px; }
  .claukk {
    --bg: #050706;
    --panel: #0a0e0c;
    --gr: #121613;
    --white: #f3f5f2;
    --gray: #8b968f;
    --dim: #5c6560;
    --em: #1fae7a;
    --emb: #3fe0a6;
    --emd: #0c3626;
    --line: rgba(243, 245, 242, 0.09);
    --lk: rgba(5, 7, 6, 0.1);
    box-sizing: border-box;
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    background: var(--white);
    color: var(--bg);
    font-family: Manrope, system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    overflow-x: hidden;
    display: block;
  }
  .claukk *, .claukk *::before, .claukk *::after { box-sizing: border-box; }
  .claukk a { color: inherit; text-decoration: none; }
  .claukk button { font: inherit; cursor: pointer; }
  .claukk :focus-visible { outline: 2px solid var(--emb); outline-offset: 3px; }
  .claukk .w { max-width: 1160px; margin: 0 auto; padding: 0 24px; }
  .claukk .btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 14px 26px; border-radius: 10px; font-weight: 700;
    border: 1px solid var(--line); color: var(--white);
    transition: 0.2s; background: transparent;
  }
  .claukk .btn:hover { transform: translateY(-2px); border-color: var(--emb); }
  .claukk .btn.p {
    background: var(--emb); color: var(--bg);
    border-color: var(--emb); font-weight: 800;
  }
  .claukk .btn.p:hover {
    background: var(--em); border-color: var(--em);
    box-shadow: 0 8px 30px rgba(63, 224, 166, 0.25);
  }
  .claukk .btn.d { background: var(--bg); color: var(--white); border-color: var(--bg); }
  .claukk .btn.o { color: var(--bg); border-color: var(--lk); }
  .claukk .btn.o:hover { border-color: var(--em); }

  .claukk nav {
    position: sticky; top: 0; z-index: 20;
    background: var(--bg); border-bottom: 1px solid var(--line);
    color: var(--white);
  }
  .claukk nav .w { display: flex; align-items: center; gap: 32px; height: 64px; }
  .claukk .logo { font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
  .claukk .logo i { font-style: normal; color: var(--emb); }
  .claukk .logo small {
    display: block; font-size: 10px; font-weight: 500;
    color: var(--dim); letter-spacing: 0; line-height: 1;
  }
  .claukk .links {
    display: flex; gap: 28px; flex: 1;
    color: var(--gray); font-weight: 600; font-size: 14px;
  }
  .claukk .links a:hover { color: var(--white); }
  .claukk nav .btn { padding: 9px 18px; font-size: 14px; }

  .claukk .hero {
    background: var(--bg); color: var(--white);
    position: relative; overflow: hidden;
    padding: 72px 0 0; text-align: center;
  }
  .claukk .hero::before {
    content: ''; position: absolute; inset: 0;
    background:
      repeating-linear-gradient(90deg, var(--line) 0 1px, transparent 1px 80px),
      repeating-linear-gradient(0deg, var(--line) 0 1px, transparent 1px 80px);
    -webkit-mask-image: radial-gradient(ellipse at 50% 30%, #000 0, transparent 70%);
    mask-image: radial-gradient(ellipse at 50% 30%, #000 0, transparent 70%);
    opacity: 0.7;
  }
  .claukk .hero::after {
    content: ''; position: absolute; left: 50%; top: -120px;
    width: 900px; height: 600px; transform: translateX(-50%);
    background: radial-gradient(closest-side, rgba(31, 174, 122, 0.28), transparent);
    animation: claukk-glow 6s ease-in-out infinite alternate;
  }
  @keyframes claukk-glow {
    to { opacity: 0.55; transform: translateX(-50%) scale(1.15); }
  }
  .claukk .hero .w { position: relative; z-index: 2; }
  .claukk .badge {
    display: inline-flex; align-items: center; gap: 8px;
    border: 1px solid var(--line); border-radius: 99px;
    padding: 6px 14px; font-size: 13px; color: var(--gray);
    background: var(--panel);
  }
  .claukk .dot {
    width: 8px; height: 8px; border-radius: 50%; background: var(--emb);
    box-shadow: 0 0 0 0 rgba(63, 224, 166, 0.6);
    animation: claukk-pulse 2s infinite;
  }
  @keyframes claukk-pulse {
    70% { box-shadow: 0 0 0 9px rgba(63, 224, 166, 0); }
    100% { box-shadow: 0 0 0 0 rgba(63, 224, 166, 0); }
  }
  .claukk h1 {
    font-size: clamp(38px, 6.4vw, 72px); line-height: 1.04;
    letter-spacing: -0.035em; margin: 24px auto 20px;
    max-width: 880px; font-weight: 800;
  }
  .claukk h1 em { font-style: normal; color: var(--emb); }
  .claukk .lead {
    color: var(--gray); font-size: 19px;
    max-width: 620px; margin: 0 auto 32px;
  }
  .claukk .cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .claukk .fine { color: var(--dim); font-size: 13px; margin: 18px 0 48px; }

  .claukk .stage { perspective: 1600px; padding-bottom: 0; }
  .claukk .mock {
    max-width: 1000px; margin: 0 auto;
    transform: rotateX(var(--rx, 10deg)) rotateY(var(--ry, 0deg));
    transform-origin: 50% 100%;
    transition: transform 0.25s ease-out;
    position: relative;
    animation: claukk-rise 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) both 0.2s;
  }
  @keyframes claukk-rise {
    from { opacity: 0; transform: rotateX(26deg) translateY(60px); }
  }
  .claukk .win {
    background: var(--panel); border: 1px solid var(--line);
    border-bottom: 0; border-radius: 14px 14px 0 0;
    overflow: hidden; box-shadow: 0 -20px 80px rgba(31, 174, 122, 0.12);
  }
  .claukk .tb {
    display: flex; gap: 6px; padding: 12px 16px;
    border-bottom: 1px solid var(--line); align-items: center;
  }
  .claukk .tb i { width: 10px; height: 10px; border-radius: 50%; background: var(--gr); }
  .claukk .tb span {
    margin-left: 12px; font-size: 11px; color: var(--dim);
    background: var(--bg); padding: 3px 40px; border-radius: 6px;
  }
  .claukk .app { display: grid; grid-template-columns: 170px 1fr; height: 420px; text-align: left; }
  .claukk .sb {
    background: var(--bg); padding: 16px 10px;
    border-right: 1px solid var(--line); font-size: 12px; color: var(--gray);
  }
  .claukk .sb b { display: block; color: var(--white); font-size: 15px; padding: 0 8px 14px; }
  .claukk .sb b i { font-style: normal; color: var(--emb); }
  .claukk .sb div { padding: 8px 10px; border-radius: 7px; margin-bottom: 2px; }
  .claukk .sb .on { background: var(--emd); color: var(--emb); box-shadow: inset 3px 0 var(--emb); }
  .claukk .mn { background: var(--white); color: var(--bg); padding: 18px 20px; overflow: hidden; position: relative; }
  .claukk .mn h4 { margin: 0; font-size: 15px; }
  .claukk .mn p { margin: 0 0 12px; font-size: 11px; color: var(--dim); }
  .claukk .mm { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
  .claukk .mm div { border: 1px solid var(--lk); border-radius: 9px; padding: 10px; }
  .claukk .mm small { font-size: 9px; color: var(--dim); font-weight: 700; display: block; }
  .claukk .mm b { font-size: 16px; letter-spacing: -0.02em; }
  .claukk .mm div:first-child { background: var(--bg); color: var(--white); }
  .claukk .mm div:first-child small { color: var(--gray); }
  .claukk .ch { border: 1px solid var(--lk); border-radius: 9px; padding: 12px; height: 178px; }
  .claukk .ch svg { width: 100%; height: 100%; }
  .claukk .dr { stroke-dasharray: 1; stroke-dashoffset: 1; animation: claukk-draw 2.4s ease-out forwards 0.9s; }
  @keyframes claukk-draw { to { stroke-dashoffset: 0; } }
  .claukk .af { opacity: 0; animation: claukk-fade 1s forwards 2.4s; }
  @keyframes claukk-fade { to { opacity: 1; } }

  .claukk .cart {
    position: absolute; right: 18px; top: 60px; width: 230px;
    background: var(--bg); color: var(--white);
    border: 1px solid var(--line); border-radius: 12px; padding: 14px;
    box-shadow: 0 30px 60px rgba(5, 7, 6, 0.35);
    animation: claukk-flt 5s ease-in-out infinite alternate;
    text-align: left; font-size: 12px;
  }
  @keyframes claukk-flt { to { transform: translateY(-10px); } }
  .claukk .cart h5 { margin: 0 0 8px; font-size: 13px; }
  .claukk .cl { min-height: 92px; }
  .claukk .ln {
    display: flex; justify-content: space-between; padding: 6px 0;
    border-top: 1px solid var(--line); animation: claukk-in 0.4s ease-out;
  }
  @keyframes claukk-in { from { opacity: 0; transform: translateX(18px); } }
  .claukk .ln small { color: var(--gray); display: block; }
  .claukk .ct {
    display: flex; justify-content: space-between; align-items: baseline;
    border-top: 1px solid var(--line); padding-top: 8px;
  }
  .claukk .ct b {
    font-size: 22px; color: var(--emb); letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }
  .claukk .pay {
    margin-top: 10px; background: var(--emb); color: var(--bg);
    border-radius: 8px; text-align: center; padding: 9px;
    font-weight: 800; transition: 0.3s;
  }
  .claukk .pay.ok { background: var(--emd); color: var(--emb); }
  .claukk .scan {
    position: absolute; left: 210px; bottom: 24px;
    background: var(--bg); color: var(--emb);
    border: 1px solid var(--emd); border-radius: 10px;
    padding: 8px 12px; font-size: 11px; font-weight: 700;
    opacity: 0; transform: translateY(10px); transition: 0.4s;
    box-shadow: 0 14px 30px rgba(5, 7, 6, 0.3);
  }
  .claukk .scan.on { opacity: 1; transform: none; }

  .claukk .strip {
    border-top: 1px solid var(--line); background: var(--panel);
    color: var(--gray); overflow: hidden; white-space: nowrap;
    padding: 16px 0; position: relative; z-index: 3;
    font-weight: 600; font-size: 14px;
  }
  .claukk .strip div { display: inline-block; animation: claukk-mq 28s linear infinite; }
  .claukk .strip span { margin: 0 28px; }
  .claukk .strip span::before {
    content: '◆'; color: var(--em); margin-right: 28px;
    font-size: 8px; vertical-align: middle;
  }
  @keyframes claukk-mq { to { transform: translateX(-50%); } }

  .claukk section { padding: 96px 0; }
  .claukk .eye {
    color: var(--em); font-weight: 700; font-size: 13px;
    letter-spacing: 0.08em; text-transform: uppercase;
  }
  .claukk h2 {
    font-size: clamp(30px, 4vw, 46px); line-height: 1.1;
    letter-spacing: -0.03em; margin: 10px 0 14px;
    font-weight: 800; max-width: 700px;
  }
  .claukk .sub { color: var(--dim); font-size: 18px; max-width: 600px; margin: 0; }

  .claukk .fg {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px;
    background: var(--lk); border: 1px solid var(--lk);
    border-radius: 14px; overflow: hidden; margin-top: 48px;
  }
  .claukk .f { background: var(--white); padding: 28px; position: relative; transition: 0.25s; }
  .claukk .f:hover { background: var(--bg); color: var(--white); }
  .claukk .f:hover p { color: var(--gray); }
  .claukk .f:hover .ic { background: var(--emd); color: var(--emb); }
  .claukk .ic {
    width: 44px; height: 44px; border-radius: 10px;
    background: var(--bg); color: var(--emb);
    display: grid; place-items: center; margin-bottom: 18px; transition: 0.25s;
  }
  .claukk .ic svg {
    width: 22px; height: 22px; stroke: currentColor; fill: none;
    stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round;
  }
  .claukk .f h3 { margin: 0 0 6px; font-size: 18px; }
  .claukk .f p { margin: 0; color: var(--dim); font-size: 15px; transition: 0.25s; }

  .claukk .dk { background: var(--bg); color: var(--white); }
  .claukk .dk .sub { color: var(--gray); }
  .claukk .dk h2 { color: var(--white); }
  .claukk .st {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 24px; margin-top: 48px; position: relative;
  }
  .claukk .s {
    border: 1px solid var(--line); border-radius: 14px;
    padding: 28px; background: var(--panel);
  }
  .claukk .s b {
    font-size: 48px; color: var(--emb); letter-spacing: -0.04em;
    line-height: 1; display: block; margin-bottom: 12px; opacity: 0.9;
  }
  .claukk .s h3 { margin: 0 0 6px; }
  .claukk .s p { margin: 0; color: var(--gray); font-size: 15px; }

  .claukk .pr {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 24px; max-width: 860px; margin: 48px auto 0;
  }
  .claukk .pc {
    border: 1px solid var(--lk); border-radius: 16px; padding: 32px;
    position: relative; transition: 0.25s; background: var(--white);
  }
  .claukk .pc:hover { transform: translateY(-4px); }
  .claukk .pc.hl {
    background: var(--bg); color: var(--white); border-color: var(--bg);
    box-shadow: 0 30px 70px rgba(5, 7, 6, 0.25);
  }
  .claukk .tag {
    position: absolute; top: -12px; left: 32px;
    background: var(--emb); color: var(--bg);
    font-size: 12px; font-weight: 800; padding: 3px 12px; border-radius: 99px;
  }
  .claukk .pc h3 { margin: 0; font-size: 15px; color: var(--dim); font-weight: 600; }
  .claukk .pc.hl h3 { color: var(--gray); }
  .claukk .am {
    font-size: 56px; font-weight: 800; letter-spacing: -0.04em;
    line-height: 1.1; margin: 8px 0 2px;
  }
  .claukk .am small { font-size: 16px; font-weight: 600; color: var(--dim); letter-spacing: 0; }
  .claukk .pc ul { list-style: none; padding: 0; margin: 20px 0 28px; }
  .claukk .pc li { padding: 6px 0 6px 28px; position: relative; font-size: 15px; }
  .claukk .pc li::before {
    content: '✓'; position: absolute; left: 0;
    color: var(--em); font-weight: 800;
  }
  .claukk .pc.hl li::before { color: var(--emb); }
  .claukk .pc .btn { width: 100%; justify-content: center; }
  .claukk .save {
    display: inline-block; background: var(--emd); color: var(--emb);
    font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 99px;
  }

  .claukk .faq { max-width: 760px; margin: 40px auto 0; }
  .claukk details { border-bottom: 1px solid var(--lk); padding: 20px 0; }
  .claukk summary {
    font-weight: 700; font-size: 18px; cursor: pointer;
    list-style: none; display: flex; justify-content: space-between;
    align-items: center; gap: 16px;
  }
  .claukk summary::-webkit-details-marker { display: none; }
  .claukk summary::after {
    content: '+'; color: var(--em); font-size: 24px;
    line-height: 1; transition: 0.2s;
  }
  .claukk details[open] summary::after { transform: rotate(45deg); }
  .claukk details p { color: var(--dim); margin: 10px 0 0; max-width: 680px; }

  .claukk .fin {
    text-align: center; background: var(--bg); color: var(--white);
    position: relative; overflow: hidden;
  }
  .claukk .fin h2 { margin: 10px auto 14px; color: var(--white); }
  .claukk .fin .sub { margin: 0 auto 32px; color: var(--gray); }

  .claukk footer {
    background: var(--bg); color: var(--dim);
    border-top: 1px solid var(--line); padding: 32px 0; font-size: 14px;
  }
  .claukk footer .w {
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px;
  }

  .claukk .rv {
    opacity: 0; transform: translateY(28px);
    transition: opacity 0.7s, transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .claukk .rv.in { opacity: 1; transform: none; }

  @media (max-width: 900px) {
    .claukk .fg, .claukk .st, .claukk .pr { grid-template-columns: 1fr; }
    .claukk .links { display: none; }
    .claukk nav .w { justify-content: space-between; }
    .claukk .app { grid-template-columns: 1fr; height: auto; min-height: 380px; }
    .claukk .sb { display: none; }
    .claukk .cart {
      position: relative; right: auto; top: auto;
      width: auto; margin: 12px 0 0;
    }
    .claukk .scan { display: none; }
    .claukk .mm { grid-template-columns: 1fr 1fr; }
    .claukk section { padding: 64px 0; }
    .claukk .mock { --rx: 4deg !important; }
  }

  @media (prefers-reduced-motion: reduce) {
    .claukk *, .claukk *::before, .claukk *::after {
      animation: none !important; transition: none !important;
    }
    .claukk .rv { opacity: 1; transform: none; }
    .claukk .dr { stroke-dashoffset: 0; }
    .claukk .af { opacity: 1; }
  }
`;