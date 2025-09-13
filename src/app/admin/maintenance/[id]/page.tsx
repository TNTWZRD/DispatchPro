
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MaintenanceTicket, Vehicle, TicketActivity, AppUser } from '@/lib/types';
import { Role } from '@/lib/types';
import { Loader2, Ticket, Wrench, Edit, MessageSquare, Workflow } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatUserName } from '@/lib/utils';
import { EditTicketForm } from '@/components/edit-ticket-form';
import { AddCommentForm } from '@/components/add-comment-form';
import Link from 'next/link';

const getStatusVariant = (status?: MaintenanceTicket['status']) => {
    if (!status) return 'bg-gray-500';
    switch (status) {
        case 'open': return 'bg-red-500';
        case 'in-progress': return 'bg-yellow-500';
        case 'closed': return 'bg-green-600';
        default: return 'bg-gray-500';
    }
};

const getPriorityVariant = (priority?: MaintenanceTicket['priority']) => {
    if (!priority) return 'secondary';
    switch(priority) {
        case 'low': return 'secondary';
        case 'medium': return 'default';
        case 'high': return 'destructive';
    }
};

export default function TicketDetailsPage() {
    const { user, allUsers, loading: authLoading, hasRole } = useAuth();
    const router = useRouter();
    const params = useParams();
    const ticketId = params.id as string;

    const [ticket, setTicket] = useState<MaintenanceTicket | null>(null);
    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [activity, setActivity] = useState<TicketActivity[]>([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [isEditFormOpen, setIsEditFormOpen] = useState(false);

    const canAccess = hasRole(Role.ADMIN) || hasRole(Role.OWNER);

    useEffect(() => {
        if (!authLoading) {
            if (!user) router.push('/login');
            else if (!canAccess) router.push('/');
        }
    }, [user, authLoading, router, canAccess]);

    useEffect(() => {
        if (!ticketId) return;

        const ticketUnsub = onSnapshot(doc(db, 'tickets', ticketId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                const fetchedTicket = {
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as MaintenanceTicket;
                setTicket(fetchedTicket);
                
                // Fetch associated vehicle
                const vehicleUnsub = onSnapshot(doc(db, 'vehicles', fetchedTicket.vehicleId), (vehicleDoc) => {
                     if (vehicleDoc.exists()) {
                        setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle);
                     }
                });
                return () => vehicleUnsub();

            } else {
                setTicket(null);
            }
            setPageLoading(false);
        });

        const activityQuery = query(collection(db, 'tickets', ticketId, 'activity'), orderBy('timestamp', 'asc'));
        const activityUnsub = onSnapshot(activityQuery, (snapshot) => {
            setActivity(snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    timestamp: data.timestamp?.toDate(),
                } as TicketActivity
            }));
        });

        return () => {
            ticketUnsub();
            activityUnsub();
        };
    }, [ticketId]);

    const getUserDetails = (userId: string) => {
        return allUsers.find(u => u.uid === userId);
    };

    if (authLoading || pageLoading || !user || !canAccess) {
        return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    if (!ticket) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Card><CardHeader><CardTitle>Ticket Not Found</CardTitle></CardHeader></Card>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 bg-secondary/50">
            <div className="max-w-4xl mx-auto flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardDescription>Ticket #{ticket.id.substring(0, 6)}</CardDescription>
                                <CardTitle className="flex items-center gap-3 text-2xl mt-1">
                                    <Ticket className="h-7 w-7 text-primary" />
                                    {ticket.title}
                                </CardTitle>
                            </div>
                            <Button onClick={() => setIsEditFormOpen(true)}>
                                <Edit className="mr-2" /> Edit Ticket
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                            <div><span className="font-semibold">Status:</span> <Badge className={cn("capitalize text-white", getStatusVariant(ticket.status))}>{ticket.status.replace('-', ' ')}</Badge></div>
                            <div><span className="font-semibold">Priority:</span> <Badge variant={getPriorityVariant(ticket.priority)} className="capitalize">{ticket.priority}</Badge></div>
                            <div><span className="font-semibold">Vehicle:</span> <Link href={`/admin/vehicles/${vehicle?.id}`} className="text-primary hover:underline">{vehicle?.nickname || 'N/A'}</Link></div>
                            <div><span className="font-semibold">Created:</span> {format(ticket.createdAt, 'PP')}</div>
                        </div>
                         {ticket.description && (
                            <div className="mt-4 border-t pt-4">
                                <h4 className="font-semibold mb-1">Description:</h4>
                                <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">{ticket.description}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wrench className="h-6 w-6 text-primary" />
                            Activity & Comments
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="space-y-6">
                            {activity.map(act => {
                                const author = getUserDetails(act.userId);
                                return (
                                    <div key={act.id} className="flex items-start gap-4">
                                        <Avatar>
                                            <AvatarImage src={author?.photoURL ?? undefined} />
                                            <AvatarFallback>{(author?.displayName || 'U')[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 text-sm">
                                                <span className="font-semibold">{formatUserName(author?.displayName, author?.email)}</span>
                                                <span className="text-muted-foreground text-xs">{formatDistanceToNowStrict(act.timestamp, { addSuffix: true })}</span>
                                            </div>
                                             <div className="mt-1 text-sm text-muted-foreground p-3 bg-secondary/50 rounded-md">
                                                {act.type === 'comment' ? (
                                                     <p className="flex items-start gap-2"><MessageSquare className="h-4 w-4 mt-0.5 text-foreground/70 flex-shrink-0" /> {act.content}</p>
                                                ) : (
                                                     <p className="flex items-start gap-2 italic"><Workflow className="h-4 w-4 mt-0.5 text-foreground/70 flex-shrink-0" /> {act.content}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                             {activity.length === 0 && <p className="text-sm text-muted-foreground text-center">No activity yet.</p>}
                        </div>
                        <div className="mt-6 border-t pt-6">
                            <AddCommentForm ticketId={ticket.id} userId={user.uid} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <EditTicketForm
                ticket={ticket}
                isOpen={isEditFormOpen}
                onOpenChange={setIsEditFormOpen}
            />
        </div>
    );
}
