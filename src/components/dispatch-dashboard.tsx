
"use client";

import React, { useState, useEffect, useCallback, useContext } from 'react';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { initialRides, initialDrivers } from '@/lib/data';
import { DragDropContext, Draggable, type DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RideCard } from './ride-card';
import { CallLoggerForm } from './call-logger-form';
import { VoiceControl } from './voice-control';
import { Truck, PlusCircle, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriverColumn } from './driver-column';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrictModeDroppable } from './strict-mode-droppable';
import { Sidebar } from './sidebar';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { ZoomProvider, ZoomContext } from '@/context/zoom-context';


function DispatchDashboardUI() {
  const [rides, setRides] = useState<Ride[]>(initialRides);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [time, setTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeTab, setActiveTab] = useState('waiting');
  const isMobile = useIsMobile();
  
  const { zoom, zoomIn, zoomOut } = useContext(ZoomContext);
  
  const activeDrivers = drivers.filter(d => d.status !== 'offline');

  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => setTime(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    const tabIndex = ['waiting', ...activeDrivers.map(d => d.id)].indexOf(value);
    if (carouselApi && tabIndex !== -1) {
      carouselApi.scrollTo(tabIndex);
    }
  }, [carouselApi, activeDrivers]);

  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      const newTab = ['waiting', ...activeDrivers.map(d => d.id)][selectedIndex];
      setActiveTab(newTab);
    };

    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, activeDrivers]);

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
    setIsFormOpen(false);
    setTimeout(() => {
      setRides(prev => prev.map(r => r.id === newRide.id ? { ...r, isNew: false } : r));
    }, 5000);
  };
  
  const handleEditRide = (updatedRide: Ride) => {
    setRides(prev => prev.map(r => r.id === updatedRide.id ? updatedRide : r));
    setEditingRide(null);
    setIsFormOpen(false);
  }

  const handleAssignDriver = (rideId: string, driverId: string) => {
    const rideToAssign = rides.find(r => r.id === rideId);
    if (!rideToAssign) return;

    const driver = drivers.find(d => d.id === driverId);
    if (driver?.status === 'offline') {
      console.warn(`Driver ${driverId} is offline.`);
      return;
    }

    setRides(prevRides => {
        const newRides = [...prevRides];
        const rideIndex = newRides.findIndex(r => r.id === rideId);
        if (rideIndex === -1) return prevRides;

        const originalRide = newRides[rideIndex];
        const originalDriverId = originalRide.driverId;

        // Update the ride with the new driver and status
        newRides[rideIndex] = { ...originalRide, driverId: driverId, status: 'assigned' };

        setDrivers(prevDrivers => {
            const newDrivers = [...prevDrivers];
            
            // Set new driver to 'on-ride' if they are not already
             const newDriverIndex = newDrivers.findIndex(d => d.id === driverId);
            if (newDriverIndex !== -1) {
               newDrivers[newDriverIndex] = { ...newDrivers[newDriverIndex], status: 'on-ride' };
            }
            
            // If ride was reassigned, check if old driver becomes available
            if (originalDriverId && originalDriverId !== driverId) {
                const otherRidesForOldDriver = newRides.filter(r => r.driverId === originalDriverId && r.id !== rideId && ['assigned', 'in-progress'].includes(r.status));
                if (otherRidesForOldDriver.length === 0) {
                     const oldDriverIndex = newDrivers.findIndex(d => d.id === originalDriverId);
                     if (oldDriverIndex !== -1) {
                        newDrivers[oldDriverIndex] = {...newDrivers[oldDriverIndex], status: 'available'};
                     }
                }
            }
            return newDrivers;
        });

        return newRides;
    });
  };
  
  const handleUnassignDriver = (rideId: string) => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride || !ride.driverId) return;

    const driverId = ride.driverId;

    // Set ride back to pending and remove driver
    setRides(prev => prev.map(r => r.id === rideId ? { ...r, status: 'pending', driverId: null } : r));

    // Check if the driver has any other active rides
    const otherRides = rides.filter(r => r.driverId === driverId && r.id !== rideId && ['assigned', 'in-progress'].includes(r.status));
    if (otherRides.length === 0) {
      setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, status: 'available' } : d));
    }
  };

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const ride = rides.find(r => r.id === draggableId);
    if (!ride) return;

    if (destination.droppableId.startsWith('driver-')) {
      const driverId = destination.droppableId;
      handleAssignDriver(ride.id, driverId);
    } else if (destination.droppableId === 'waiting') {
      handleUnassignDriver(ride.id);
    }
  };


  const handleChangeStatus = (rideId: string, newStatus: RideStatus) => {
    setRides(prevRides => {
      const rideToUpdate = prevRides.find(ride => ride.id === rideId);
      if (!rideToUpdate) return prevRides;

      const updatedRides = prevRides.map(ride => 
        ride.id === rideId ? { ...ride, status: newStatus, completionTime: (newStatus === 'completed' || newStatus === 'cancelled') ? new Date() : undefined } : ride
      );

      // If ride is completed or cancelled, check driver status
      if ((newStatus === 'completed' || newStatus === 'cancelled') && rideToUpdate.driverId) {
        const driverId = rideToUpdate.driverId;
        const remainingRides = updatedRides.filter(r => r.driverId === driverId && ['assigned', 'in-progress'].includes(r.status));
        if (remainingRides.length === 0) {
          setDrivers(prevDrivers =>
            prevDrivers.map(driver =>
              driver.id === driverId ? { ...driver, status: 'available' } : driver
            )
          );
        }
      }
      
      // If ride is cancelled, it should lose its driver
      if (newStatus === 'cancelled') {
        return updatedRides.map(r => r.id === rideId ? {...r, driverId: null} : r);
      }

      return updatedRides;
    });
  };

  const handleSetFare = (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number; card?: number; check?: number; tip?: number; } }) => {
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id !== rideId) return ride;
        return { ...ride, totalFare: details.totalFare, paymentDetails: details.paymentDetails };
      })
    );
  };
  
  const handleOpenEdit = (ride: Ride) => {
    setEditingRide(ride);
    setIsFormOpen(true);
  }

  const handleOpenLogNew = () => {
    setEditingRide(null);
    setIsFormOpen(true);
  }
  
  const pendingRides = rides.filter(r => r.status === 'pending');

  const renderDesktopView = () => {
    const totalColumns = activeDrivers.length + 1;
    const columnWidth = Math.max(280, 100 / totalColumns * 20); // Dynamic width with a minimum

    return (
     <DragDropContext onDragEnd={onDragEnd}>
        <div 
          className="flex flex-1 items-stretch gap-4 overflow-x-auto pb-4 transition-transform origin-top-left"
          style={{ 
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
           }}
        >
            {/* Waiting Column */}
            <StrictModeDroppable droppableId="waiting">
              {(provided, snapshot) => (
                <Card
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    "shrink-0 flex flex-col",
                    snapshot.isDraggingOver && "bg-accent/20"
                  )}
                   style={{ width: `${columnWidth}px` }}
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
                              onUnassignDriver={handleUnassignDriver}
                              onEdit={handleOpenEdit}
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
            </StrictModeDroppable>

          {/* Driver Columns */}
          {activeDrivers.map(driver => (
            <DriverColumn
              key={driver.id}
              driver={driver}
              rides={rides.filter(r => r.driverId === driver.id && (r.status === 'assigned' || r.status === 'in-progress'))}
              allDrivers={drivers}
              onAssignDriver={handleAssignDriver}
              onChangeStatus={handleChangeStatus}
              onSetFare={handleSetFare}
              onUnassignDriver={handleUnassignDriver}
              onEditRide={handleOpenEdit}
              style={{ width: `${columnWidth}px` }}
            />
          ))}
        </div>
      </DragDropContext>
  )};

  const renderMobileView = () => {
    return (
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col flex-1 min-h-0">
        <TabsList
          className="grid w-full"
          style={{ gridTemplateColumns: `repeat(${activeDrivers.length + 1}, minmax(0, 1fr))` }}
        >
          <TabsTrigger value="waiting">Waiting ({pendingRides.length})</TabsTrigger>
          {activeDrivers.map(driver => (
            <TabsTrigger key={driver.id} value={driver.id}>{driver.name.split(' ')[0]}</TabsTrigger>
          ))}
        </TabsList>
        
        <Carousel setApi={setCarouselApi} className="flex-1 w-full mt-4">
          <CarouselContent>
            {/* Waiting Tab */}
            <CarouselItem>
              <div className="space-y-4 h-full overflow-y-auto">
                {pendingRides.map((ride) => (
                  <RideCard
                    key={ride.id}
                    ride={ride}
                    drivers={drivers}
                    onAssignDriver={handleAssignDriver}
                    onChangeStatus={handleChangeStatus}
                    onSetFare={handleSetFare}
                    onUnassignDriver={handleUnassignDriver}
                    onEdit={handleOpenEdit}
                  />
                ))}
                {pendingRides.length === 0 && (
                  <div className="flex h-full items-center justify-center text-muted-foreground pt-10">
                      <p>No pending rides.</p>
                  </div>
                )}
              </div>
            </CarouselItem>

            {/* Driver Tabs */}
            {activeDrivers.map(driver => (
              <CarouselItem key={driver.id}>
                  <DriverColumn
                      driver={driver}
                      rides={rides.filter(r => r.driverId === driver.id && ['assigned', 'in-progress'].includes(r.status))}
                      allDrivers={drivers}
                      onAssignDriver={handleAssignDriver}
                      onChangeStatus={handleChangeStatus}
                      onSetFare={handleSetFare}
                      onUnassignDriver={handleUnassignDriver}
                      onEditRide={handleOpenEdit}
                    />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </Tabs>
  )};

  return (
    <div className="flex h-screen flex-col bg-secondary/50">
      <header className="flex h-16 shrink-0 items-center border-b bg-card px-6 shadow-sm">
        <Truck className="h-6 w-6 text-primary" />
        <h1 className="ml-3 text-xl md:text-2xl font-bold tracking-tight text-foreground">
          DispatchPro
        </h1>
        <div className="ml-auto flex items-center gap-2">
           <div className="text-sm text-muted-foreground hidden md:block">
            {isClient && time && <>{time.toLocaleDateString()} {time.toLocaleTimeString()}</>}
          </div>
          
          <div className="items-center gap-2 hidden md:flex">
             <Button variant="outline" size="icon" onClick={zoomOut}>
              <ZoomOut />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button variant="outline" size="icon" onClick={zoomIn}>
              <ZoomIn />
            </Button>
          </div>

          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              <Button size={isMobile ? 'sm' : 'default'} onClick={handleOpenLogNew}>
                <PlusCircle />
                Log New Call
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <CallLoggerForm 
                onAddRide={handleAddRide} 
                onEditRide={handleEditRide}
                rideToEdit={editingRide}
              />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6 lg:flex-row">
        <Sidebar 
            rides={rides} 
            drivers={drivers}
            onAssignSuggestion={handleAssignDriver} 
        />
        
        <div className='flex-1 flex flex-col min-w-0'>
          {isClient && (isMobile ? renderMobileView() : renderDesktopView())}
        </div>
      </main>
      <VoiceControl
          rides={rides}
          drivers={drivers}
          onAddRide={handleAddRide}
          onAssignDriver={handleAssignDriver}
          onChangeStatus={handleChangeStatus}
        />
    </div>
  );
}


export function DispatchDashboard() {
  return (
    <ZoomProvider>
      <DispatchDashboardUI />
    </ZoomProvider>
  )
}
