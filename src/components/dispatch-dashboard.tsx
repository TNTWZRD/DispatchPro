"use client";

import React, { useState, useEffect } from 'react';
import type { Ride, Driver, RideStatus, PaymentMethod } from '@/lib/types';
import { initialRides, initialDrivers } from '@/lib/data';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapView } from './map-view';
import { RideList } from './ride-list';
import { CallLoggerForm } from './call-logger-form';
import { RideHistoryTable } from './ride-history-table';
import { DispatchSuggester } from './dispatch-suggester';
import { Truck } from 'lucide-react';

export function DispatchDashboard() {
  const [rides, setRides] = useState<Ride[]>(initialRides);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000 * 60); // Update time every minute
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Simulate real-time driver movement
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
    
    // Remove the 'new' flag after a few seconds
    setTimeout(() => {
      setRides(prev => prev.map(r => r.id === newRide.id ? {...r, isNew: false} : r));
    }, 5000);
  };

  const handleAssignDriver = (rideId: string, driverId: string) => {
    setRides(prevRides =>
      prevRides.map(ride =>
        ride.id === rideId ? { ...ride, status: 'assigned', driverId } : ride
      )
    );
    setDrivers(prevDrivers =>
      prevDrivers.map(driver =>
        driver.id === driverId ? { ...driver, status: 'on-ride' } : driver
      )
    );
  };

  const handleChangeStatus = (rideId: string, newStatus: RideStatus) => {
    setRides(prevRides => {
      const updatedRides = prevRides.map(ride => {
        if (ride.id !== rideId) return ride;

        const updatedRide = { ...ride, status: newStatus };
        if (newStatus === 'completed' || newStatus === 'cancelled') {
          updatedRide.completionTime = new Date();
          
          // Free up the driver
          if (ride.driverId) {
            setDrivers(prevDrivers =>
              prevDrivers.map(driver =>
                driver.id === ride.driverId ? { ...driver, status: 'available' } : driver
              )
            );
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
  const activeRides = rides.filter(r => ['assigned', 'in-progress'].includes(r.status));
  const pastRides = rides.filter(r => ['completed', 'cancelled'].includes(r.status));
  const availableDrivers = drivers.filter(d => d.status === 'available');

  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="flex h-16 items-center border-b bg-card px-6 shadow-sm">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="ml-3 text-2xl font-bold tracking-tight text-foreground">
          DispatchPro
        </h1>
        <div className="ml-auto text-sm text-muted-foreground">
          {time.toLocaleDateString()} {time.toLocaleTimeString()}
        </div>
      </header>

      <main className="flex-1 overflow-auto p-4 md:p-6">
        <Tabs defaultValue="dispatch">
          <TabsList className="mb-4">
            <TabsTrigger value="dispatch">Live Dispatch</TabsTrigger>
            <TabsTrigger value="history">Ride History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dispatch">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              <div className="lg:col-span-2 xl:col-span-3">
                <MapView rides={rides} drivers={drivers} />
              </div>

              <div className="row-start-1 flex flex-col gap-4 lg:col-start-3 xl:col-start-4">
                 <DispatchSuggester pendingRides={pendingRides} availableDrivers={availableDrivers} onAssignSuggestion={handleAssignDriver}/>
                 <CallLoggerForm onAddRide={handleAddRide} />
              </div>

              <div className="flex flex-col gap-4 lg:col-span-3 xl:col-span-2">
                <RideList 
                  title="Pending & Upcoming" 
                  rides={pendingRides} 
                  drivers={availableDrivers} 
                  onAssignDriver={handleAssignDriver} 
                  onChangeStatus={handleChangeStatus}
                  onSetFare={handleSetFare}
                />
              </div>

              <div className="flex flex-col gap-4 lg:col-span-3 xl:col-span-2 lg:col-start-1 lg:row-start-2 xl:col-start-3 xl:row-start-2">
                <RideList 
                  title="Active Rides" 
                  rides={activeRides} 
                  drivers={drivers}
                  onAssignDriver={handleAssignDriver} 
                  onChangeStatus={handleChangeStatus}
                  onSetFare={handleSetFare}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Ride History</CardTitle>
              </CardHeader>
              <CardContent>
                <RideHistoryTable rides={pastRides} drivers={drivers} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
