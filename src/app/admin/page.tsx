
"use client";

import { UserManagementTable } from '@/components/user-management-table';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { Role } from '@/lib/types';
import { InviteUserForm } from '@/components/invite-user-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewDriverForm } from '@/components/new-driver-form';

export default function AdminPage() {
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
            <Card className="max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        User & Driver Management
                    </CardTitle>
                    <CardDescription>
                        Manage user roles and create driver profiles.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col gap-4">
                    <div className="flex justify-end gap-2">
                        <NewDriverForm />
                        <InviteUserForm />
                    </div>
                    <UserManagementTable />
                 </CardContent>
            </Card>
        </div>
    );
}
