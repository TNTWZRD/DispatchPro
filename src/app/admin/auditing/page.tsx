
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, FileWarning } from 'lucide-react';
import { Role } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { AdminBreadcrumb } from '@/components/admin-breadcrumb';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnpaidRidesTable } from '@/components/unpaid-rides-table';
import { BanListManagement } from '@/components/ban-list-management';

export default function AuditingPage() {
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
            <div className="max-w-7xl mx-auto flex flex-col gap-6">
                <AdminBreadcrumb segments={[{ name: 'Admin', href: '/admin' }, { name: 'Auditing' }]} />
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileWarning className="h-6 w-6 text-primary" />
                            Auditing & Security
                        </CardTitle>
                        <CardDescription>
                            Review unpaid rides and manage the platform-wide ban list.
                        </CardDescription>
                    </CardHeader>
                     <CardContent className="flex flex-col gap-4">
                        <Tabs defaultValue="unpaid" className="w-full">
                            <TabsList>
                                <TabsTrigger value="unpaid">Unpaid Rides</TabsTrigger>
                                <TabsTrigger value="bans">Ban List</TabsTrigger>
                            </TabsList>
                            <TabsContent value="unpaid" className="mt-4">
                               <UnpaidRidesTable />
                            </TabsContent>
                            <TabsContent value="bans" className="mt-4">
                                <BanListManagement />
                            </TabsContent>
                        </Tabs>
                     </CardContent>
                </Card>
            </div>
        </div>
    );
}
