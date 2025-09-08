
"use client";

import React, { useState, useEffect } from 'react';
import type { Ride, Driver, RideStatus, PaymentMethod } from '@/lib/types';
import { initialRides, initialDrivers } from '@/lib/data';
import { DragDropContext, Droppable, Draggable, type DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapView } from './map-view';
import { RideCard } from './ride-card';
import { CallLoggerForm } from './call-logger-form';
import { DispatchSuggester } from './dispatch-suggester';
import { Truck, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriverColumn } from './driver-column';

export function DispatchDashboard() {
  const [rides, setRides] = useState<Ride[]>(initialRides);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [time, setTime] = useState(new Date());
  const [isClient, setIsClient] = useState(false);
  const [isLogCallOpen, setIsLogCallOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => setTime(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const movementInterval = setInterval(() => {
      setDrivers(prevDrivers =>
        prevDrivers.map(driver => {
          if (driver.status === 'offline') return driver;
          const moveX = Math.random() > 0.5 ? 1 : -1;
          const moveY = Math.random() > 0.5 ? 1 : -1;
          return {
            ...driver,
            location: {
              x: Math.max(0, Math.min(100, driver.location.x + moveX)),
              y: Math.max(0, Math.min(100, driver.location.y + moveY)),
            },
          };
        })
      );
    }, 5000);
    return () => clearInterval(movementInterval);
  }, []);

  const handleAddRide = (newRideData: Omit<Ride, 'id' | 'status' | 'driverId' | 'requestTime' | 'isNew'>) => {
    const newRide: Ride = {
      ...newRideData,
      id: `ride-${Date.now()}`,
      status: 'pending',
      driverId: null,
      requestTime: new Date(),
      isNew: true,
    };
    setRides(prev => [newRide, ...prev]);
    setIsLogCallOpen(false);
    setTimeout(() => {
      setRides(prev => prev.map(r => r.id === newRide.id ? { ...r, isNew: false } : r));
    }, 5000);
  };

  const handleAssignDriver = (rideId: string, driverId: string) => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride) return;

    // If driver is already on a ride, don't allow assignment
    const driver = drivers.find(d => d.id === driverId);
    if (driver?.status === 'on-ride' || driver?.status === 'offline') {
      // Maybe show a toast here in a real app
      console.warn(`Driver ${driverId} is not available.`);
      return;
    }
    
    // Unassign from previous driver if it was a reassignment
    if (ride.driverId) {
        setDrivers(prevDrivers => prevDrivers.map(d => d.id === ride.driverId ? {...d, status: 'available'} : d));
    }

    setRides(prevRides =>
      prevRides.map(r =>
        r.id === rideId ? { ...r, status: 'assigned', driverId } : r
      )
    );
    setDrivers(prevDrivers =>
      prevDrivers.map(d =>
        d.id === driverId ? { ...d, status: 'on-ride' } : d
      )
    );
  };
  
  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    // Dropped in the same place
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const ride = rides.find(r => r.id === draggableId);
    if (!ride) return;

    // Moving from 'waiting' column to a driver column
    if (source.droppableId === 'waiting' && destination.droppableId.startsWith('driver-')) {
      const driverId = destination.droppableId;
      handleAssignDriver(ride.id, driverId);
    }
  };


  const handleChangeStatus = (rideId: string, newStatus: RideStatus) => {
    setRides(prevRides => {
      const updatedRides = prevRides.map(ride => {
        if (ride.id !== rideId) return ride;

        const updatedRide = { ...ride, status: newStatus };
        if (newStatus === 'completed' || newStatus === 'cancelled') {
          updatedRide.completionTime = new Date();
          if (ride.driverId) {
            setDrivers(prevDrivers =>
              prevDrivers.map(driver =>
                driver.id === ride.driverId ? { ...driver, status: 'available' } : driver
              )
            );
          }
           if (newStatus === 'cancelled') {
              updatedRide.driverId = null;
           }
        }
        return updatedRide;
      });
      return updatedRides;
    });
  };

  const handleSetFare = (rideId: string, fare: number, paymentMethod: PaymentMethod) => {
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id !== rideId) return ride;
        let cardFee: number | undefined;
        if (paymentMethod === 'card') {
          cardFee = Math.floor(fare / 40);
        }
        return { ...ride, fare, paymentMethod, cardFee };
      })
    );
  };
  
  const pendingRides = rides.filter(r => r.status === 'pending');
  const activeDrivers = drivers.filter(d => d.status !== 'offline');

  return (
    <div className="flex h-screen flex-col bg-secondary/50">
      <header className="flex h-16 shrink-0 items-center border-b bg-card px-6 shadow-sm">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="ml-3 text-2xl font-bold tracking-tight text-foreground">
          DispatchPro
        </h1>
        <div className="ml-auto flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {time.toLocaleDateString()} {time.toLocaleTimeString()}
          </div>
          <Dialog open={isLogCallOpen} onOpenChange={setIsLogCallOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle />
                Log New Call
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <CallLoggerForm onAddRide={handleAddRide} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
        <div className='flex-shrink-0'>
            <MapView rides={rides} drivers={drivers} />
        </div>
        
        {isClient && (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
                {/* Waiting Column */}
                <Droppable droppableId="waiting">
                  {(provided, snapshot) => (
                    <Card
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "w-80 shrink-0 flex flex-col",
                        snapshot.isDraggingOver && "bg-accent/20"
                      )}
                    >
                      <CardHeader>
                        <CardTitle>Waiting ({pendingRides.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-1 overflow-y-auto space-y-4">
                        {pendingRides.map((ride, index) => (
                          <Draggable key={ride.id} draggableId={ride.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <RideCard
                                  ride={ride}
                                  drivers={drivers}
                                  onAssignDriver={handleAssignDriver}
                                  onChangeStatus={handleChangeStatus}
                                  onSetFare={handleSetFare}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                         {pendingRides.length === 0 && (
                            <div className="flex h-full items-center justify-center text-muted-foreground">
                                <p>No pending rides.</p>
                            </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </Droppable>

              {/* Driver Columns */}
              {activeDrivers.map(driver => (
                <DriverColumn
                  key={driver.id}
                  driver={driver}
                  ride={rides.find(r => r.driverId === driver.id && ['assigned', 'in-progress'].includes(r.status))}
                  allDrivers={drivers}
                  onAssignDriver={handleAssignDriver}
                  onChangeStatus={handleChangeStatus}
                  onSetFare={handleSetFare}
                />
              ))}
            </div>
          </DragDropContext>
        )}
      </main>
    </div>
  );
}
