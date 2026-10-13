"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import SetupStaffModal from "./SetupStaffModal";

export default function SetupGate({ children }) {
    const supabase = createClient();
    const router = useRouter();

    const [state, setState] = useState("loading"); // loading | needs-setup | ready
    const [staff, setStaff] = useState(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                if (!cancelled) router.replace("/login");
                return;
            }

            // 1. Check localStorage first (a cashier's shift)
            const localId = window.localStorage.getItem("claukk_staff_id");
            if (localId) {
                const { data: st } = await supabase
                    .from("staff")
                    .select("id, name, role, is_active")
                    .eq("id", localId)
                    .eq("is_active", true)
                    .maybeSingle();

                if (st) {
                    if (!cancelled) {
                        setStaff(st);
                        setState("ready");
                    }
                    return;
                }
                // stale localStorage — clear it
                window.localStorage.removeItem("claukk_staff_id");
                window.localStorage.removeItem("claukk_staff_name");
                window.localStorage.removeItem("claukk_staff_role");
            }

            // 2. No shift active — does the signed-in owner have a staff row?
            const { data: ownRow } = await supabase
                .from("staff")
                .select("id, name, role, is_active")
                .eq("owner_id", user.id)
                .eq("is_active", true)
                .limit(1)
                .maybeSingle();

            if (cancelled) return;

            if (!ownRow) {
                setState("needs-setup");
            } else {
                setStaff(ownRow);
                setState("ready");
            }
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (state === "loading") {
        return (
            <div className="flex h-full w-full items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-lk border-t-emb" />
            </div>
        );
    }

    if (state === "needs-setup") {
        return (
            <SetupStaffModal
                onSuccess={() => {
                    // Reload the page so the gate re-runs with the new staff row
                    window.location.reload();
                }}
            />
        );
    }

    return children;
}