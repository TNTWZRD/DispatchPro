
"use client";

import React, { useState, useMemo } from 'react';
import { initialRides, initialDrivers } from '@/lib/data';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverRideCard } from './driver-ride-card';
import { Truck, CheckCircle } from 'lucide-react';
import { Separator } from './ui/separator';
import { ResponsiveDialog } from './responsive-dialog';
import { DriverEditForm } from './driver-edit-form';

export function DriverDashboard() {
  const [rides, setRides] = useState<Ride[]>(initialRides);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);

  const currentDriverId = 'driver-3';
  const currentDriver = useMemo(() => drivers.find(d => d.id === currentDriverId), [drivers]);

  const driverRides = useMemo(() => {
    return rides
      .filter(r => r.driverId === currentDriverId && ['assigned', 'in-progress'].includes(r.status))
      .sort((a, b) => (a.status === 'in-progress' ? -1 : 1));
  }, [rides, currentDriverId]);
  
  const completedRides = useMemo(() => {
      return rides
        .filter(r => r.driverId === currentDriverId && r.status === 'completed')
        .sort((a,b) => (b.droppedOffAt?.getTime() ?? 0) - (a.droppedOffAt?.getTime() ?? 0));
  }, [rides, currentDriverId]);

  const currentRide = useMemo(() => {
    return driverRides.find(r => r.status === 'in-progress') || driverRides[0] || null;
  }, [driverRides]);
  
  const upcomingRides = useMemo(() => {
      return driverRides.filter(r => r.id !== currentRide?.id)
  }, [driverRides, currentRide]);

  const handleChangeStatus = (rideId: string, newStatus: RideStatus) => {
    setRides(prevRides => {
        const now = new Date();
        const updatedRides = prevRides.map(ride => {
            if (ride.id !== rideId) return ride;

            const updatedRide = { ...ride, status: newStatus, updatedAt: now };

            if (newStatus === 'in-progress') {
                updatedRide.pickedUpAt = now;
            } else if (newStatus === 'completed') {
                updatedRide.droppedOffAt = now;
            }
            return updatedRide;
        });

        const activeRidesForDriver = updatedRides.filter(r => r.driverId === currentDriverId && ['assigned', 'in-progress'].includes(r.status));
        
        setDrivers(prevDrivers => prevDrivers.map(driver => {
            if (driver.id === currentDriverId) {
                return { ...driver, status: activeRidesForDriver.length > 0 ? 'on-ride' : 'available' };
            }
            return driver;
        }));

        return updatedRides;
    });
  };
  
  const handleEditRide = (rideId: string, details: { cashTip?: number, notes?: string }) => {
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id !== rideId) return ride;
        
        const newPaymentDetails = { ...ride.paymentDetails, cashTip: details.cashTip };
        const newNotes = details.notes;

        return {
          ...ride,
          notes: newNotes,
          paymentDetails: newPaymentDetails,
          updatedAt: new Date()
        };
      })
    );
    setEditingRide(null);
  };
  
  const handleOpenEdit = (ride: Ride) => {
      setEditingRide(ride);
  }

  if (!currentDriver) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary">
        <p>Driver not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-secondary/50">
       <header className="flex h-16 shrink-0 items-center border-b bg-card px-6 shadow-sm">
         <Truck className="h-6 w-6 text-primary" />
        <h1 className="ml-3 text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Driver Dashboard
        </h1>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="font-semibold">{currentDriver.name}</div>
            <div className="text-xs text-muted-foreground">{currentDriver.vehicle}</div>
          </div>
          <Avatar>
            <AvatarImage src={`https://i.pravatar.cc/40?u=${currentDriver.id}`} />
            <AvatarFallback>{currentDriver.name.charAt(0)}</AvatarFallback>
          </Avatar>
        </div>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
            {!currentRide && completedRides.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Ready for a New Ride</CardTitle>
                        <CardDescription>You have no assigned rides right now. You will be notified when a new ride is dispatched to you.</CardDescription>
                    </CardHeader>
                </Card>
            ) : (
                <>
                {currentRide && (
                    <div>
                        <h2 className="text-lg font-semibold mb-2">{currentRide.status === 'in-progress' ? 'Current Ride' : 'Next Ride'}</h2>
                        <DriverRideCard 
                            ride={currentRide}
                            onChangeStatus={handleChangeStatus}
                            onEdit={handleOpenEdit}
                        />
                    </div>
                )}

                {upcomingRides.length > 0 && (
                    <div>
                        <Separator className="my-6" />
                        <h2 className="text-lg font-semibold mb-2">Upcoming Queue ({upcomingRides.length})</h2>
                        <div className="space-y-4">
                            {upcomingRides.map(ride => (
                                <DriverRideCard 
                                    key={ride.id}
                                    ride={ride}
                                    isQueued={true}
                                    onChangeStatus={handleChangeStatus}
                                    onEdit={handleOpenEdit}
                                />
                            ))}
                        </div>
                    </div>
                )}
                </>
            )}

            {completedRides.length > 0 && (
                 <div>
                    <Separator className="my-6" />
                    <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle />
                        Completed Today ({completedRides.length})
                    </h2>
                    <div className="space-y-4">
                        {completedRides.map(ride => (
                            <DriverRideCard 
                                key={ride.id}
                                ride={ride}
                                onChangeStatus={handleChangeStatus}
                                onEdit={handleOpenEdit}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
      </main>
      
      <ResponsiveDialog
        open={!!editingRide}
        onOpenChange={(isOpen) => !isOpen && setEditingRide(null)}
        title="Add Ride Details"
      >
        {editingRide && (
             <DriverEditForm 
                key={editingRide.id}
                ride={editingRide}
                onSave={handleEditRide}
             />
        )}
      </ResponsiveDialog>
    </div>
  );
}
