
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Wrench } from 'lucide-react';
import { Role } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AllMaintenanceTicketsTable } from '@/components/all-maintenance-tickets-table';
import { AdminBreadcrumb } from '@/components/admin-breadcrumb';

export default function MaintenancePage() {
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
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
                <AdminBreadcrumb segments={[{ name: 'Admin', href: '/admin' }, { name: 'Maintenance' }]} />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wrench className="h-6 w-6 text-primary" />
                            Maintenance Ticket Management
                        </CardTitle>
                        <CardDescription>
                            View and manage all maintenance tickets across the fleet.
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="flex flex-col gap-4">
                        <AllMaintenanceTicketsTable />
                     </CardContent>
                </Card>
            </div>
        </div>
    );
}
