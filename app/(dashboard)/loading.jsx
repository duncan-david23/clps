export default function Loading() {
  return (
    <div className="claukk-loading">
      <style dangerouslySetInnerHTML={{ __html: LOADING_STYLES }} />

      <div className="lwrap">
        {/* Animated logo */}
        <div className="llogo">
          {/* <span className="ltile">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z" />
            </svg>
          </span> */}
          <span className="ltext">
            Claukk<i>POS</i>
          </span>
        </div>

        {/* Bars */}
        <div className="lbars" role="status" aria-label="Loading">
          <i /><i /><i /><i /><i />
        </div>

        <p className="lmsg">Loading your workspace…</p>
      </div>
    </div>
  );
}

const LOADING_STYLES = `
  .claukk-loading {
    --bg:#050706;--panel:#0a0e0c;--white:#f3f5f2;--gray:#8b968f;
    --dim:#5c6560;--em:#1fae7a;--emb:#3fe0a6;--emd:#0c3626;
    --line:rgba(243,245,242,.09);

    display: grid;
    place-items: center;
    width: 100%;
    min-height: 100%;
    padding: 40px 24px;
    background:
      radial-gradient(60% 50% at 50% 0%, rgba(31,174,122,.10), transparent 70%),
      radial-gradient(60% 50% at 50% 100%, rgba(99,102,241,.06), transparent 70%),
      #f3f5f2;
    color: var(--bg);
    font-family: Manrope, system-ui, sans-serif;
    overflow: hidden;
  }

  /* the grid backdrop */
  .claukk-loading::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      repeating-linear-gradient(90deg, rgba(5,7,6,.05) 0 1px, transparent 1px 64px),
      repeating-linear-gradient(0deg, rgba(5,7,6,.05) 0 1px, transparent 1px 64px);
    -webkit-mask-image: radial-gradient(ellipse at 50% 50%, #000 0, transparent 75%);
    mask-image: radial-gradient(ellipse at 50% 50%, #000 0, transparent 75%);
    pointer-events: none;
  }

  .claukk-loading .lwrap {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
    animation: loadFade .5s cubic-bezier(.2,.8,.2,1) both;
  }

  @keyframes loadFade {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* logo block */
  .claukk-loading .llogo {
    display: flex;
    align-items: center;
    gap: 12px;
    animation: logoPop .7s cubic-bezier(.2,.8,.2,1) both;
  }

  @keyframes logoPop {
    0%   { opacity: 0; transform: scale(.85); }
    60%  { opacity: 1; transform: scale(1.03); }
    100% { opacity: 1; transform: scale(1); }
  }

  .claukk-loading .ltile {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: linear-gradient(135deg, #1fae7a, #3fe0a6);
    color: #050706;
    box-shadow:
      0 8px 24px -8px rgba(31,174,122,.55),
      inset 0 0 0 1px rgba(255,255,255,.15);
    position: relative;
  }

  /* pulsing ring around tile */
  .claukk-loading .ltile::after {
    content: "";
    position: absolute;
    inset: -6px;
    border-radius: 16px;
    border: 1px solid rgba(31,174,122,.35);
    animation: tileRing 1.8s ease-in-out infinite;
  }

  @keyframes tileRing {
    0%, 100% { transform: scale(1); opacity: .6; }
    50%      { transform: scale(1.08); opacity: 0; }
  }

  .claukk-loading .ltile svg {
    width: 20px;
    height: 20px;
  }

  .claukk-loading .ltext {
    font-size: 22px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #050706;
  }

  .claukk-loading .ltext i {
    font-style: normal;
    color: #1fae7a;
  }

  /* equalizer bars */
  .claukk-loading .lbars {
    display: flex;
    align-items: flex-end;
    gap: 5px;
    height: 26px;
    margin-top: 4px;
  }

  .claukk-loading .lbars i {
    display: block;
    width: 4px;
    border-radius: 2px;
    background: linear-gradient(180deg, #3fe0a6, #1fae7a);
    box-shadow: 0 0 8px rgba(31,174,122,.35);
    animation: barBounce 1.1s ease-in-out infinite;
  }

  .claukk-loading .lbars i:nth-child(1) { height: 12px; animation-delay: 0s; }
  .claukk-loading .lbars i:nth-child(2) { height: 22px; animation-delay: .12s; }
  .claukk-loading .lbars i:nth-child(3) { height: 16px; animation-delay: .24s; }
  .claukk-loading .lbars i:nth-child(4) { height: 26px; animation-delay: .36s; }
  .claukk-loading .lbars i:nth-child(5) { height: 14px; animation-delay: .48s; }

  @keyframes barBounce {
    0%, 100% { transform: scaleY(.45); opacity: .55; }
    50%      { transform: scaleY(1);   opacity: 1; }
  }

  /* message */
  .claukk-loading .lmsg {
    font-size: 13px;
    font-weight: 600;
    color: #5c6560;
    letter-spacing: 0.01em;
    animation: msgFade 1.6s ease-in-out infinite;
  }

  @keyframes msgFade {
    0%, 100% { opacity: .55; }
    50%      { opacity: 1; }
  }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .claukk-loading *,
    .claukk-loading *::before,
    .claukk-loading *::after {
      animation: none !important;
      transition: none !important;
    }
  }

  /* Dark theme variant — remove if you want light always */
  @media (prefers-color-scheme: dark) {
    .claukk-loading {
      background:
        radial-gradient(60% 50% at 50% 0%, rgba(31,174,122,.15), transparent 70%),
        radial-gradient(60% 50% at 50% 100%, rgba(99,102,241,.08), transparent 70%),
        #050706;
      color: #f3f5f2;
    }
    .claukk-loading .ltext { color: #f3f5f2; }
    .claukk-loading .lmsg  { color: #8b968f; }
    .claukk-loading .ltile {
      background: linear-gradient(135deg, #1fae7a, #3fe0a6);
      color: #050706;
    }
  }
`;