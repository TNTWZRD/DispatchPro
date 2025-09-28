
"use client";

import { DispatchDashboard } from '@/components/dispatch-dashboard';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Role } from '@/lib/types';

export default function Home() {
    const { user, loading, hasRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (hasRole(Role.DRIVER) && !hasRole(Role.DISPATCHER)) {
                // If user is ONLY a driver, redirect to driver page.
                // If they are dispatcher AND driver, they can see the dispatch board.
                router.push('/driver');
            }
        }
    }, [user, loading, router, hasRole]);

    if (loading || !user || !hasRole(Role.DISPATCHER)) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <DispatchDashboard />
    );
}
