
"use client";

import { UserManagementTable } from '@/components/user-management-table';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Shield } from 'lucide-react';
import { Role } from '@/lib/types';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { InviteUserForm } from '@/components/invite-user-form';

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
        <div className="flex h-screen flex-col bg-secondary/50">
            <header className="flex h-16 shrink-0 items-center border-b bg-card px-6 shadow-sm">
                <Shield className="h-6 w-6 text-primary" />
                <h1 className="ml-3 text-xl md:text-2xl font-bold tracking-tight text-foreground">
                    Admin Panel
                </h1>
                <div className="ml-auto flex items-center gap-4">
                    <InviteUserForm />
                    <Button asChild variant="outline">
                        <Link href="/">Back to Dispatch</Link>
                    </Button>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 md:p-6">
                <UserManagementTable />
            </main>
        </div>
    );
}
