
"use client";

import React, { useState, useEffect, useCallback, useContext } from 'react';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { initialRides, initialDrivers } from '@/lib/data';
import { DragDropContext, Draggable, type DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RideCard } from './ride-card';
import { CallLoggerForm } from './call-logger-form';
import { VoiceControl } from './voice-control';
import { Truck, PlusCircle, ZoomIn, ZoomOut, Minimize2, Maximize2, Calendar, History, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DriverColumn } from './driver-column';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrictModeDroppable } from './strict-mode-droppable';
import { Sidebar } from './sidebar';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { ZoomProvider, ZoomContext } from '@/context/zoom-context';
import { CondensedModeProvider, useCondensedMode } from '@/context/condensed-mode-context';
import { useHotkey } from '@/hooks/use-hotkey';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ResponsiveDialog } from './responsive-dialog';


function DispatchDashboardUI() {
  const [rides, setRides] = useState<Ride[]>(initialRides);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [time, setTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeTab, setActiveTab] = useState('waiting');
  const [showCancelled, setShowCancelled] = useState(false);

  const isMobile = useIsMobile();
  
  const { zoom, zoomIn, zoomOut } = useContext(ZoomContext);
  const { isCondensed, toggleCondensedMode } = useCondensedMode();

  useHotkey('s', toggleCondensedMode, { alt: true });
  
  const activeDrivers = drivers.filter(d => d.status !== 'offline');
  
  const allPendingRides = rides.filter(r => r.status === 'pending');
  const pendingRides = allPendingRides.filter(r => !r.scheduledTime);
  const scheduledRides = allPendingRides.filter(r => r.scheduledTime);
  const cancelledRides = rides.filter(r => r.status === 'cancelled');
  
  const hasScheduledRides = scheduledRides.length > 0;

  useEffect(() => {
    setIsClient(true);
    const timer = setInterval(() => setTime(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    const tabs = ['waiting'];
    if (hasScheduledRides) tabs.push('scheduled');
    tabs.push(...activeDrivers.map(d => d.id));
    const tabIndex = tabs.indexOf(value);

    if (carouselApi && tabIndex !== -1) {
      carouselApi.scrollTo(tabIndex);
    }
  }, [carouselApi, activeDrivers, hasScheduledRides]);


  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      const tabs = ['waiting'];
      if (hasScheduledRides) tabs.push('scheduled');
      tabs.push(...activeDrivers.map(d => d.id));
      const newTab = tabs[selectedIndex];

      if (newTab) {
        setActiveTab(newTab);
      }
    };

    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, activeDrivers, hasScheduledRides]);

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

  const handleAddRide = (newRideData: Omit<Ride, 'id' | 'status' | 'driverId' | 'createdAt' | 'updatedAt' | 'isNew'>) => {
    const now = new Date();
    const newRide: Ride = {
      ...newRideData,
      id: `ride-${Date.now()}`,
      status: 'pending',
      driverId: null,
      createdAt: now,
      updatedAt: now,
      isNew: true,
    };
    setRides(prev => [newRide, ...prev]);
    setIsFormOpen(false);
    setTimeout(() => {
      setRides(prev => prev.map(r => r.id === newRide.id ? { ...r, isNew: false } : r));
    }, 5000);
  };
  
  const handleEditRide = (updatedRide: Ride) => {
    setRides(prev => prev.map(r => r.id === updatedRide.id ? { ...updatedRide, updatedAt: new Date() } : r));
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
        const now = new Date();

        // Update the ride with the new driver and status
        newRides[rideIndex] = { ...originalRide, status: 'assigned', updatedAt: now, assignedAt: now };
        
        // If the ride has a scheduled time, we don't immediately assign a driver
        if (!originalRide.scheduledTime) {
            newRides[rideIndex].driverId = driverId;
        } else {
            // For scheduled rides, we just set the driverId, but status might remain 'pending' until pickup time
            newRides[rideIndex].driverId = driverId;
        }


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
    setRides(prev => prev.map(r => r.id === rideId ? { ...r, status: 'pending', driverId: null, updatedAt: new Date(), assignedAt: undefined } : r));

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
    } else if (destination.droppableId === 'waiting' || destination.droppableId === 'scheduled') {
      handleUnassignDriver(ride.id);
    }
  };


  const handleChangeStatus = (rideId: string, newStatus: RideStatus) => {
    setRides(prevRides => {
      const rideToUpdate = prevRides.find(ride => ride.id === rideId);
      if (!rideToUpdate) return prevRides;

      const now = new Date();
      const updatedRide = { ...rideToUpdate, status: newStatus, updatedAt: now };

      if (newStatus === 'in-progress') {
        updatedRide.pickedUpAt = now;
      } else if (newStatus === 'completed') {
        updatedRide.droppedOffAt = now;
      } else if (newStatus === 'cancelled') {
        updatedRide.cancelledAt = now;
        updatedRide.driverId = null; // Remove driver from cancelled ride
      } else if (newStatus === 'pending' && rideToUpdate.status === 'cancelled') {
        updatedRide.cancelledAt = undefined; // Clear cancellation time
      }


      const updatedRides = prevRides.map(ride => 
        ride.id === rideId ? updatedRide : ride
      );

      // If ride is completed or cancelled, check if old driver should become available
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

      return updatedRides;
    });
  };

  const handleSetFare = (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number; card?: number; check?: number; tip?: number; } }) => {
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id !== rideId) return ride;
        return { ...ride, totalFare: details.totalFare, paymentDetails: details.paymentDetails, updatedAt: new Date() };
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

  const renderDesktopView = () => {
    const totalColumns = activeDrivers.length + (hasScheduledRides ? 2 : 1) + (showCancelled ? 1 : 0);
    const columnWidth = Math.max(280, 100 / totalColumns * 20); // Dynamic width with a minimum

    return (
     <DragDropContext onDragEnd={onDragEnd}>
        <div 
          className="flex flex-1 items-stretch gap-2 overflow-x-auto pb-2 transition-transform origin-top-left"
          style={{ 
            transform: `scale(${zoom})`,
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
           }}
        >
            {/* Cancelled Column */}
            {showCancelled && (
              <StrictModeDroppable droppableId="cancelled" isDropDisabled={true}>
                {(provided) => (
                  <Card
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="shrink-0 flex flex-col bg-muted/50"
                    style={{ width: `${columnWidth}px` }}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <XCircle className="h-5 w-5" /> Cancelled ({cancelledRides.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                      {cancelledRides.map((ride, index) => (
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
                      {provided.placeholder}
                    </CardContent>
                  </Card>
                )}
              </StrictModeDroppable>
            )}
            
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
                    <CardTitle className="text-base">Waiting ({pendingRides.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
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
            
            {/* Scheduled Column */}
            {hasScheduledRides && (
              <StrictModeDroppable droppableId="scheduled">
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
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-5 w-5" /> Scheduled ({scheduledRides.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                      {scheduledRides.map((ride, index) => (
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
                    </CardContent>
                  </Card>
                )}
              </StrictModeDroppable>
            )}


          {/* Driver Columns */}
          {activeDrivers.map(driver => (
            <DriverColumn
              key={driver.id}
              driver={driver}
              rides={rides.filter(r => ['assigned', 'in-progress', 'completed'].includes(r.status) && r.driverId === driver.id)}
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
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex flex-col flex-1">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="waiting">Waiting ({pendingRides.length})</TabsTrigger>
          {hasScheduledRides && <TabsTrigger value="scheduled">Scheduled ({scheduledRides.length})</TabsTrigger>}
          {activeDrivers.map(driver => (
            <TabsTrigger key={driver.id} value={driver.id}>{driver.name.split(' ')[0]}</TabsTrigger>
          ))}
        </TabsList>
        
        <div className="flex-1 mt-4 overflow-hidden">
            <Carousel setApi={setCarouselApi} className="h-full">
              <CarouselContent className="h-full">
                {/* Waiting Tab */}
                <CarouselItem className="overflow-y-auto">
                  <div className="space-y-4 h-full pr-1">
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
                
                {/* Scheduled Tab */}
                {hasScheduledRides && (
                  <CarouselItem className="overflow-y-auto">
                    <div className="space-y-4 h-full pr-1">
                      {scheduledRides.map((ride) => (
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
                    </div>
                  </CarouselItem>
                )}


                {/* Driver Tabs */}
                {activeDrivers.map(driver => (
                  <CarouselItem key={driver.id} className="overflow-y-auto">
                      <div className="pr-1">
                        <DriverColumn
                            driver={driver}
                            rides={rides.filter(r => ['assigned', 'in-progress', 'completed'].includes(r.status) && r.driverId === driver.id)}
                            allDrivers={drivers}
                            onAssignDriver={handleAssignDriver}
                            onChangeStatus={handleChangeStatus}
                            onSetFare={handleSetFare}
                            onUnassignDriver={handleUnassignDriver}
                            onEditRide={handleOpenEdit}
                          />
                      </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
        </div>
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
             <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" onClick={() => setShowCancelled(prev => !prev)}>
                        <History />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Toggle Cancelled Rides Column</p>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={toggleCondensedMode}>
                            {isCondensed ? <Maximize2 /> : <Minimize2 />}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Toggle Condensed View (Alt+S)</p>
                    </TooltipContent>
                </Tooltip>
             </TooltipProvider>

             <Button variant="outline" size="icon" onClick={zoomOut}>
              <ZoomOut />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button variant="outline" size="icon" onClick={zoomIn}>
              <ZoomIn />
            </Button>
          </div>

          <Button size={isMobile ? 'sm' : 'default'} onClick={handleOpenLogNew}>
            <PlusCircle />
            Log New Call
          </Button>
          
          <ResponsiveDialog 
            open={isFormOpen} 
            onOpenChange={setIsFormOpen}
            title={editingRide ? 'Edit Ride Details' : 'Log New Call'}
          >
            <CallLoggerForm 
              key={editingRide?.id || 'new'}
              onAddRide={handleAddRide} 
              onEditRide={handleEditRide}
              rideToEdit={editingRide}
            />
          </ResponsiveDialog>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-hidden lg:flex-row p-2">
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
        <CondensedModeProvider>
            <DispatchDashboardUI />
        </CondensedModeProvider>
    </ZoomProvider>
  )
}
