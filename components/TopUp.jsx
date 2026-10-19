'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

const PLANS = [
  {
    key: 'trial',
    name: '24-hour trial',
    days: 1,
    price: 10,
    hint: '1 credit · try it with real sales',
  },
  {
    key: 'month',
    name: '30-day plan',
    days: 30,
    price: 199,
    hint: '30 consecutive days from activation',
    tag: 'RECOMMENDED',
  },
];

export default function TopUp() {
  const router = useRouter();
  const supabase = createClient();

  const [plan, setPlan] = useState('month');
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const selected = PLANS.find((p) => p.key === plan);

  const handlePay = async () => {
    setError('');

    if (typeof window === 'undefined' || !window.PaystackPop) {
      return setError('Payment is still loading. Try again in a second.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return setError('Session lost. Please sign in again.');
    }

    setPaying(true);

    const handler = window.PaystackPop.setup({
      key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
      email: user.email,
      amount: selected.price * 100, // pesewas
      currency: 'GHS',
      metadata: {
        custom_fields: [
          { display_name: 'Plan', variable_name: 'plan', value: plan },
        ],
      },
      callback: (response) => {
        (async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('credit_remaining')
            .eq('id', user.id)
            .single();

          const now = new Date().toISOString();
          const newBalance = (profile?.credit_remaining ?? 0) + selected.days;

          const { error: updateErr } = await supabase
            .from('profiles')
            .update({
              credit_remaining: newBalance,
              credits_started_at: now,
              last_credit_deduction: now,
              updated_at: now,
            })
            .eq('id', user.id);

          setPaying(false);

          if (updateErr) return setError(updateErr.message);

          router.replace('/dashboard');
          router.refresh();
        })();
      },
      onClose: () => {
        setPaying(false);
        setError('Payment cancelled.');
      },
    });

    handler.openIframe();
  };

  return (
    <>
      <div className="mt-8 grid gap-3">
        {PLANS.map((p) => {
          const on = plan === p.key;
          return (
            <label
              key={p.key}
              className={`relative flex cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                on
                  ? 'border-bg bg-bg text-white'
                  : 'border-lk hover:border-em'
              }`}
            >
              {p.tag && (
                <span className="absolute -top-2.5 right-5 rounded-full bg-emb px-2.5 py-0.5 text-[11px] font-extrabold text-bg">
                  {p.tag}
                </span>
              )}
              <input
                type="radio"
                name="plan"
                value={p.key}
                checked={on}
                onChange={() => setPlan(p.key)}
                className="h-[18px] w-[18px] accent-[#1fae7a]"
              />
              <div className="flex-1">
                <b className="block">{p.name}</b>
                <small className={on ? 'text-gray' : 'text-gray-dim'}>
                  {p.hint}
                </small>
              </div>
              <strong
                className={`text-[22px] tracking-[-0.02em] ${
                  on ? 'text-emb' : ''
                }`}
              >
                GHS {p.price}
              </strong>
            </label>
          );
        })}
      </div>

      <div className="mt-5 rounded-xl border border-lk px-5 py-4">
        <div className="flex justify-between py-1 text-[14px] text-gray-dim">
          <span>Plan</span>
          <span>{selected.name}</span>
        </div>
        <div className="flex justify-between py-1 text-[14px] text-gray-dim">
          <span>Credits added</span>
          <span>+{selected.days}</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between border-t border-lk pt-3 text-[17px] font-extrabold">
          <span>Total</span>
          <span>GHS {selected.price}.00</span>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg bg-bg/5 px-3.5 py-2.5 text-[13px] font-semibold text-red-600">
          {error}
        </div>
      )}

      <button
        onClick={handlePay}
        disabled={paying}
        className="mt-5 flex w-full items-center justify-center gap-2.5 rounded-[10px] border border-emb bg-emb py-3.5 text-[14px] font-extrabold tracking-[0.02em] text-bg transition-colors hover:bg-em disabled:opacity-70"
      >
        {paying ? 'Processing…' : `Pay GHS ${selected.price} with Paystack`}
      </button>

      <p className="mt-3 text-center text-[12px] text-gray-dim">
        Secure payment powered by Paystack. Pay with card or mobile money.
      </p>
    </>
  );
}