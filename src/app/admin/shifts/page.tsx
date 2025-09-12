
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Briefcase } from 'lucide-react';
import { Role } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StartShiftForm } from '@/components/start-shift-form';
import { ShiftManagementTable } from '@/components/shift-management-table';

export default function ShiftsPage() {
    const { user, loading, hasRole } = useAuth();
    const router = useRouter();

    const canAccess = hasRole(Role.ADMIN) || hasRole(Role.OWNER);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (!canAccess) {
                router.push('/');
            }
        }
    }, [user, loading, router, canAccess]);

    if (loading || !user || !canAccess) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 bg-secondary/50">
            <Card className="max-w-6xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Briefcase className="h-6 w-6 text-primary" />
                        Shift Management
                    </CardTitle>
                    <CardDescription>
                        Start, end, and view all driver shifts.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col gap-4">
                    <div className="flex justify-end gap-2">
                        <StartShiftForm />
                    </div>
                    <ShiftManagementTable />
                 </CardContent>
            </Card>
        </div>
    );
}
