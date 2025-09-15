
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Sprout } from 'lucide-react';
import { Role } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AdminBreadcrumb } from '@/components/admin-breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserManagementTable } from '@/components/user-management-table';
import { DriverManagementTable } from '@/components/driver-management-table';
import { VehicleManagementTable } from '@/components/vehicle-management-table';
import { AllMaintenanceTicketsTable } from '@/components/all-maintenance-tickets-table';

export default function SuperAdminPage() {
    const { user, loading, hasRole } = useAuth();
    const router = useRouter();

    const canAccess = hasRole(Role.SUPER_ADMIN);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push('/login');
            } else if (!canAccess) {
                router.push('/admin');
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
            <div className="max-w-7xl mx-auto flex flex-col gap-6">
                <AdminBreadcrumb segments={[{ name: 'Admin', href: '/admin' }, { name: 'Super Admin' }]} />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sprout className="h-6 w-6 text-primary" />
                            Super Admin Dashboard
                        </CardTitle>
                        <CardDescription>
                            A centralized view for managing all data across the platform.
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="flex flex-col gap-4">
                        <Tabs defaultValue="users" className="w-full">
                            <TabsList>
                                <TabsTrigger value="users">Users</TabsTrigger>
                                <TabsTrigger value="drivers">Drivers</TabsTrigger>
                                <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                                <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
                            </TabsList>
                            <TabsContent value="users" className="mt-4">
                                <UserManagementTable />
                            </TabsContent>
                            <TabsContent value="drivers" className="mt-4">
                                <DriverManagementTable />
                            </TabsContent>
                             <TabsContent value="vehicles" className="mt-4">
                                <VehicleManagementTable />
                            </TabsContent>
                             <TabsContent value="maintenance" className="mt-4">
                                <AllMaintenanceTicketsTable />
                            </TabsContent>
                        </Tabs>
                     </CardContent>
                </Card>
            </div>
        </div>
    );
}
