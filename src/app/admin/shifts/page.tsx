
"use client";

import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2, Briefcase, Calendar as CalendarIcon } from 'lucide-react';
import { Role } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { StartShiftForm } from '@/components/start-shift-form';
import { ShiftManagementTable } from '@/components/shift-management-table';
import { ResponsiveDialog } from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ShiftsPage() {
    const { user, loading, hasRole } = useAuth();
    const router = useRouter();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());


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
                        Start, end, and view all driver shifts for the selected day.
                    </CardDescription>
                </CardHeader>
                 <CardContent className="flex flex-col gap-4">
                    <div className="flex justify-between items-center gap-2 flex-wrap">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-[280px] justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => setSelectedDate(date || new Date())}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                        <div className="flex justify-end gap-2">
                            <Button onClick={() => setIsFormOpen(true)}>
                               <PlusCircle className="mr-2" /> Start New Shift
                            </Button>
                            <ResponsiveDialog
                                open={isFormOpen}
                                onOpenChange={setIsFormOpen}
                                title="Start New Shift"
                            >
                                <StartShiftForm onFormSubmit={() => setIsFormOpen(false)} />
                            </ResponsiveDialog>
                        </div>
                    </div>
                    <ShiftManagementTable selectedDate={selectedDate} />
                 </CardContent>
            </Card>
        </div>
    );
}
