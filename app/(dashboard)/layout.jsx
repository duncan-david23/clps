import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { createClient } from '@/lib/supabase/server';
import SetupGate from "../../components/SetupGate";

export default async function DashboardLayout({ children }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect('/login');

    return (
        
        <div className="flex h-screen w-full overflow-hidden">
            <SetupGate>
                <Sidebar />
                <main className="flex-1 overflow-y-auto">{children}</main>
            </SetupGate>
        </div>
    );
}