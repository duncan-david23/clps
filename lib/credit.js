import { createClient } from '@/lib/supabase/server';

const DAY_MS = 24 * 60 * 60 * 1000;

export async function syncCredits(userId) {
    const supabase = await createClient();

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('credit_remaining, credits_started_at, last_credit_deduction')
        .eq('id', userId)
        .single();

    if (error || !profile) return null;

    if (!profile.credits_started_at || !profile.credit_remaining) {
        await notifyLowCredits(supabase, userId, profile.credit_remaining ?? 0);
        return profile;
    }

    const now = Date.now();
    const last = new Date(
        profile.last_credit_deduction || profile.credits_started_at
    ).getTime();

    const daysPassed = Math.floor((now - last) / DAY_MS);

    if (daysPassed <= 0) {
        await notifyLowCredits(supabase, userId, profile.credit_remaining);
        return profile;
    }

    const toDeduct = Math.min(daysPassed, profile.credit_remaining);
    const newRemaining = profile.credit_remaining - toDeduct;
    const newLastDeduction = new Date(last + toDeduct * DAY_MS).toISOString();

    const { data: updated } = await supabase
        .from('profiles')
        .update({
            credit_remaining: newRemaining,
            last_credit_deduction: newLastDeduction,
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select('credit_remaining, credits_started_at, last_credit_deduction')
        .single();

    const result = updated ?? { ...profile, credit_remaining: newRemaining };

    await notifyLowCredits(supabase, userId, result.credit_remaining);

    return result;
}

async function notifyLowCredits(supabase, userId, remaining) {
    if (remaining > 3) return;

    let type = '';
    let title = '';
    let body = '';

    if (remaining === 0) {
        type = 'credit_critical';
        title = "You're out of credits";
        body = 'Top up to keep selling. Your till is paused until you buy more.';
    } else if (remaining === 1) {
        type = 'credit_critical';
        title = '1 day of credit left';
        body = 'Your till runs out tomorrow. Top up now to avoid downtime.';
    } else {
        type = 'credit_low';
        title = `${remaining} days of credit left`;
        body = "Top up soon so you don't miss a sale.";
    }

    const windowMs = type === 'credit_critical' ? 7 * DAY_MS : DAY_MS;
    const since = new Date(Date.now() - windowMs).toISOString();

    const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('owner_id', userId)
        .eq('type', type)
        .gte('created_at', since)
        .limit(1)
        .maybeSingle();

    if (existing) return;

    await supabase.from('notifications').insert({ type, title, body });
}