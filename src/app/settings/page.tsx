
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { SettingsForm } from '@/components/settings-form';

export default function SettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading || !user) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 bg-secondary/50">
            <div className="max-w-2xl mx-auto flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-6 w-6 text-primary" />
                            Profile Settings
                        </CardTitle>
                        <CardDescription>
                            Manage your personal information. Changes will be reflected across the app.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <SettingsForm user={user} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
