import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/server';
import { syncCredits } from '../../../lib/credit';
import POSClient from '../../../components/POSClient';


export default async function PosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const profile = await syncCredits(user.id);

  // No credits → block
  if (!profile || profile.credit_remaining <= 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">
          You&apos;re out of credits
        </h1>
        <p className="mt-2 text-[15px] text-gray-dim">
          Top up to keep selling with ClaukkPOS.
        </p>
        <Link
          href="/credits"
          className="mt-6 inline-block rounded-lg border border-emb bg-emb px-6 py-3 text-[14px] font-extrabold no-underline text-bg transition-colors hover:bg-em"
        >
          Buy credits
        </Link>
      </div>  
    );
  }

  return <POSClient profile={profile} />;
}