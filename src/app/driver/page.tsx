
"use client";

import { DriverDashboard } from '@/components/driver-dashboard';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Role } from '@/lib/types';

export default function DriverPage() {
    const { user, loading, hasRole } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login?role=driver');
            } else if (!hasRole(Role.DRIVER)) {
                router.push('/login?role=driver');
            }
        }
    }, [user, loading, router, hasRole]);

    if (loading || !user || !hasRole(Role.DRIVER)) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

  return (
      <DriverDashboard />
  );
}
