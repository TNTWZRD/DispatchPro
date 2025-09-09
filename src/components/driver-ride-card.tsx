
"use client";

import React from 'react';
import type { Ride, RideStatus } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, User, Phone, CheckCircle2, Package, Users, MessageSquare, Edit, Milestone } from 'lucide-react';
import { Separator } from './ui/separator';
import { cn } from '@/lib/utils';


type DriverRideCardProps = {
    ride: Ride;
    onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
    onEdit: (ride: Ride) => void;
    isQueued?: boolean;
};

export function DriverRideCard({ ride, onChangeStatus, onEdit, isQueued = false }: DriverRideCardProps) {
    
    const handleStartRide = () => {
        onChangeStatus(ride.id, 'in-progress');
    };
    
    const handleCompleteRide = () => {
        onChangeStatus(ride.id, 'completed');
    };

    return (
        <Card className={cn(
            isQueued && "bg-muted/50 border-dashed", 
            ride.status === 'completed' && "bg-secondary/70"
        )}>
            <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                    <span>{ride.pickup.name}</span>
                    <span className="text-base font-medium text-primary">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(ride.totalFare)}</span>
                </CardTitle>
                 {ride.dropoff && <CardDescription>to {ride.dropoff.name}</CardDescription>}
            </CardHeader>
            <CardContent className="space-y-3">
                 <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Users className="text-muted-foreground" />
                        <span>{ride.passengerCount || 1} Passenger(s)</span>
                    </div>
                    {ride.passengerPhone && (
                        <div className="flex items-center gap-2">
                            <Phone className="text-muted-foreground" />
                            <a href={`tel:${ride.passengerPhone}`} className="text-primary hover:underline">{ride.passengerPhone}</a>
                        </div>
                    )}
                    {ride.movingFee && (
                         <div className="flex items-center gap-2">
                            <Package className="text-muted-foreground" />
                            <span>Moving Fee Applies</span>
                        </div>
                    )}
                     {ride.paymentDetails?.cashTip && ride.paymentDetails.cashTip > 0 && (
                         <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-600">Cash Tip:</span>
                            <span>${ride.paymentDetails.cashTip.toFixed(2)}</span>
                        </div>
                    )}
                </div>
                 {ride.stops && ride.stops.length > 0 && (
                     <>
                        <Separator />
                        <div className="space-y-1 text-sm">
                            <p className="font-medium">Stops:</p>
                            {ride.stops.map((stop, index) => (
                                <div key={index} className="flex items-center gap-2 pl-2 text-muted-foreground">
                                    <Milestone className="h-4 w-4" />
                                    <span>{stop.name}</span>
                                </div>
                            ))}
                        </div>
                     </>
                 )}
                {ride.notes && (
                    <>
                        <Separator />
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                            <MessageSquare className="mt-1 flex-shrink-0" />
                            <p className="italic">{ride.notes}</p>
                        </div>
                    </>
                )}
            </CardContent>
            {!isQueued && (
                <CardFooter>
                    {ride.status === 'assigned' && (
                        <Button className="w-full" onClick={handleStartRide}>
                            <MapPin className="mr-2" /> Start Ride
                        </Button>
                    )}
                    {ride.status === 'in-progress' && (
                        <Button className="w-full" onClick={handleCompleteRide}>
                             <CheckCircle2 className="mr-2" /> Complete Ride
                        </Button>
                    )}
                    {ride.status === 'completed' && (
                        <Button variant="secondary" className="w-full" onClick={() => onEdit(ride)}>
                            <Edit className="mr-2" /> Add Details (Tip/Notes)
                        </Button>
                    )}
                </CardFooter>
            )}
        </Card>
    );
}
