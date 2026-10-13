import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { syncCredits } from '@/lib/credit';
import TopUp from '@/components/TopUp';

export default async function CreditsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const profile = await syncCredits(user.id);
    const credits = profile?.credit_remaining ?? 0;

    return (
        <div className="mx-auto max-w-[720px] px-4 py-10 md:px-8">
            <Link
                href="/dashboard"
                className="text-[13px] font-semibold text-gray-dim no-underline hover:text-bg"
            >
                ← Back to dashboard
            </Link>

            <div className="mt-6">
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-em">
                    Top up
                </span>
                <h1 className="mt-1.5 text-[32px] font-extrabold tracking-[-0.03em]">
                    {credits > 0
                        ? `You have ${credits} ${credits === 1 ? 'credit' : 'credits'} left.`
                        : "You're out of credits."}
                </h1>
                <p className="mt-2 text-[15px] text-gray-dim">
                    Every credit covers one business day of unlimited sales. Top up any time.
                </p>
            </div>

            <TopUp />
        </div>
    );
}