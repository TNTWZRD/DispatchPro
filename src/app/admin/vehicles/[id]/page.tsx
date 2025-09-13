
"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Vehicle } from '@/lib/types';
import { Role } from '@/lib/types';
import { Loader2, Truck, Wrench } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NewTicketForm } from '@/components/new-ticket-form';
import { MaintenanceTicketsTable } from '@/components/maintenance-tickets-table';
import { VehicleNotesForm } from '@/components/vehicle-notes-form';
import { Button } from '@/components/ui/button';

export default function VehicleDetailsPage() {
    const { user, loading, hasRole } = useAuth();
    const router = useRouter();
    const params = useParams();
    const vehicleId = params.id as string;

    const [vehicle, setVehicle] = useState<Vehicle | null>(null);
    const [vehicleLoading, setVehicleLoading] = useState(true);
    const [isNotesFormOpen, setIsNotesFormOpen] = useState(false);

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

    useEffect(() => {
        if (!vehicleId) return;
        const unsub = onSnapshot(doc(db, 'vehicles', vehicleId), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setVehicle({
                    ...data,
                    id: doc.id,
                    createdAt: data.createdAt?.toDate(),
                    updatedAt: data.updatedAt?.toDate(),
                } as Vehicle);
            } else {
                setVehicle(null);
            }
            setVehicleLoading(false);
        });

        return () => unsub();
    }, [vehicleId]);


    if (loading || vehicleLoading || !user || !canAccess) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!vehicle) {
        return (
             <div className="flex h-screen w-full items-center justify-center">
                <Card>
                    <CardHeader>
                        <CardTitle>Vehicle Not Found</CardTitle>
                        <CardDescription>The requested vehicle could not be found.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    return (
        <div className="h-full overflow-y-auto p-4 md:p-6 bg-secondary/50">
            <div className="max-w-6xl mx-auto flex flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between text-2xl">
                             <div className="flex items-center gap-2">
                                <Truck className="h-7 w-7 text-primary" />
                                {vehicle.nickname}
                            </div>
                            <Button variant="outline" onClick={() => setIsNotesFormOpen(true)}>Edit Notes</Button>
                        </CardTitle>
                        <CardDescription>
                            {vehicle.year} {vehicle.make} {vehicle.model}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div><span className="font-semibold">VIN:</span> {vehicle.vin || 'N/A'}</div>
                            <div><span className="font-semibold">Mileage:</span> {vehicle.mileage ? vehicle.mileage.toLocaleString() : 'N/A'}</div>
                            <div><span className="font-semibold">Status:</span> <span className="capitalize">{vehicle.status}</span></div>
                            <div><span className="font-semibold">Added:</span> {vehicle.createdAt.toLocaleDateString()}</div>
                        </div>
                         {vehicle.notes && (
                            <div className="mt-4 border-t pt-4">
                                <h4 className="font-semibold mb-1">Notes:</h4>
                                <p className="text-sm text-muted-foreground italic whitespace-pre-wrap">{vehicle.notes}</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Wrench className="h-6 w-6 text-primary" />
                            Maintenance History
                        </CardTitle>
                        <CardDescription>
                            View and manage maintenance tickets for this vehicle.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="flex justify-end">
                            <NewTicketForm vehicleId={vehicle.id} userId={user.uid} />
                        </div>
                        <MaintenanceTicketsTable vehicleId={vehicle.id} />
                    </CardContent>
                </Card>
            </div>

            <VehicleNotesForm 
                vehicle={vehicle}
                isOpen={isNotesFormOpen}
                onOpenChange={setIsNotesFormOpen}
            />
        </div>
    );
}
