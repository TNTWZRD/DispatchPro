
"use client";

import { UserManagementTable } from '@/components/user-management-table';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, Shield, Truck, User, Users, Briefcase } from 'lucide-react';
import { Role } from '@/lib/types';
import { InviteUserForm } from '@/components/invite-user-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { NewDriverForm } from '@/components/new-driver-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { DriverManagementTable } from '@/components/driver-management-table';
import { Separator } from '@/components/ui/separator';

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
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="h-6 w-6 text-primary" />
                            User & Role Management
                        </CardTitle>
                        <CardDescription>
                            Invite users and manage their roles within the application.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex justify-end items-center gap-2">
                            <InviteUserForm />
                        </div>
                        <UserManagementTable />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-6 w-6 text-primary" />
                            Driver Management
                        </CardTitle>
                        <CardDescription>
                           View, create, and manage all driver profiles, including those without user accounts.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                         <div className="flex justify-between items-center gap-2">
                             <div className="flex gap-2">
                                <Link href="/admin/vehicles" passHref>
                                    <Button variant="outline">
                                        <Truck className="mr-2" />
                                        Manage Vehicles
                                    </Button>
                                </Link>
                                <Link href="/admin/shifts" passHref>
                                    <Button variant="outline">
                                        <Briefcase className="mr-2" />
                                        Manage Shifts
                                    </Button>
                                </Link>
                            </div>
                            <NewDriverForm />
                        </div>
                        <DriverManagementTable />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
