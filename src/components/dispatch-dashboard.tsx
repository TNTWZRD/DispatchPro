
"use client";

import React, { useState, useEffect, useCallback, useContext } from 'react';
import type { Ride, Driver, RideStatus, Message } from '@/lib/types';
import { DragDropContext, Draggable, type DropResult } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RideCard } from './ride-card';
import { CallLoggerForm } from './call-logger-form';
import { VoiceControl } from './voice-control';
import { Truck, PlusCircle, ZoomIn, ZoomOut, Minimize2, Maximize2, Calendar, History, XCircle, Siren, LogOut } from 'lucide-react';
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
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, query, orderBy } from 'firebase/firestore';


function DispatchDashboardUI() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [time, setTime] = useState<Date | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeTab, setActiveTab] = useState('waiting');
  const [showCancelled, setShowCancelled] = useState(false);
  
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  
  const { zoom, zoomIn, zoomOut } = useContext(ZoomContext);
  const { isCondensed, toggleCondensedMode } = useCondensedMode();

  useHotkey('s', toggleCondensedMode, { alt: true });

  useEffect(() => {
    if (!user) return;

    const ridesQuery = query(collection(db, "rides"), orderBy("createdAt", "desc"));
    const ridesUnsub = onSnapshot(ridesQuery, (snapshot) => {
        const ridesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: data.createdAt?.toDate(),
                updatedAt: data.updatedAt?.toDate(),
                scheduledTime: data.scheduledTime?.toDate(),
                assignedAt: data.assignedAt?.toDate(),
                pickedUpAt: data.pickedUpAt?.toDate(),
                droppedOffAt: data.droppedOffAt?.toDate(),
                cancelledAt: data.cancelledAt?.toDate(),
            } as Ride;
        });
        setRides(ridesData);
    });

    const driversUnsub = onSnapshot(collection(db, "drivers"), (snapshot) => {
        const driversData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Driver));
        setDrivers(driversData);
    });

    const messagesUnsub = onSnapshot(collection(db, "messages"), (snapshot) => {
        const messagesData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                timestamp: data.timestamp?.toDate(),
            } as Message;
        });
        setMessages(messagesData);
    });

    const timer = setInterval(() => setTime(new Date()), 1000 * 60);

    return () => {
        ridesUnsub();
        driversUnsub();
        messagesUnsub();
        clearInterval(timer);
    };
  }, [user]);
  
  const activeDrivers = drivers.filter(d => d.status !== 'offline');
  
  const allPendingRides = rides.filter(r => r.status === 'pending');
  
  const pendingRides = allPendingRides
    .filter(r => !r.scheduledTime)
    .sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

  const scheduledRides = allPendingRides
    .filter(r => r.scheduledTime)
    .sort((a, b) => (a.scheduledTime?.getTime() ?? 0) - (b.scheduledTime?.getTime() ?? 0));

  const cancelledRides = rides
    .filter(r => r.status === 'cancelled')
    .sort((a, b) => (b.cancelledAt?.getTime() ?? 0) - (a.cancelledAt?.getTime() ?? 0));
  
  const hasScheduledRides = scheduledRides.length > 0;


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

  const handleAddRide = async (newRideData: Omit<Ride, 'id' | 'status' | 'driverId' | 'createdAt' | 'updatedAt' | 'isNew'>) => {
    const newRide: Omit<Ride, 'id'> = {
      ...newRideData,
      status: 'pending',
      driverId: null,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      isNew: true,
    };
    const docRef = await addDoc(collection(db, 'rides'), newRide);
    setIsFormOpen(false);
    
    setTimeout(async () => {
        await updateDoc(doc(db, 'rides', docRef.id), { isNew: false });
    }, 5000);
  };
  
  const handleEditRide = async (updatedRide: Ride) => {
    const { id, ...rideData } = updatedRide;
    await updateDoc(doc(db, 'rides', id), {
        ...rideData,
        updatedAt: serverTimestamp()
    });
    setEditingRide(null);
    setIsFormOpen(false);
  }

  const handleAssignDriver = async (rideId: string, driverId: string) => {
    const rideToAssign = rides.find(r => r.id === rideId);
    if (!rideToAssign) return;

    const driver = drivers.find(d => d.id === driverId);
    if (driver?.status === 'offline') {
      console.warn(`Driver ${driverId} is offline.`);
      return;
    }
    
    const originalDriverId = rideToAssign.driverId;

    await updateDoc(doc(db, 'rides', rideId), {
        status: 'assigned',
        driverId: driverId,
        updatedAt: serverTimestamp(),
        assignedAt: serverTimestamp()
    });

    await updateDoc(doc(db, 'drivers', driverId), { status: 'on-ride' });

    if (originalDriverId && originalDriverId !== driverId) {
        const otherRidesForOldDriver = rides.filter(r => r.driverId === originalDriverId && r.id !== rideId && ['assigned', 'in-progress'].includes(r.status));
        if (otherRidesForOldDriver.length === 0) {
            await updateDoc(doc(db, 'drivers', originalDriverId), { status: 'available' });
        }
    }
  };
  
  const handleUnassignDriver = async (rideId: string) => {
    const ride = rides.find(r => r.id === rideId);
    if (!ride || !ride.driverId) return;

    const driverId = ride.driverId;

    await updateDoc(doc(db, 'rides', rideId), {
        status: 'pending',
        driverId: null,
        updatedAt: serverTimestamp(),
        assignedAt: null
    });

    const otherRides = rides.filter(r => r.driverId === driverId && r.id !== rideId && ['assigned', 'in-progress'].includes(r.status));
    if (otherRides.length === 0) {
      await updateDoc(doc(db, 'drivers', driverId), { status: 'available' });
    }
  };

  const handleUnscheduleRide = async (rideId: string) => {
    await updateDoc(doc(db, 'rides', rideId), {
        scheduledTime: null,
        updatedAt: serverTimestamp()
    });
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
      if (ride.driverId) {
        handleUnassignDriver(ride.id);
      }
    }
  };


  const handleChangeStatus = async (rideId: string, newStatus: RideStatus) => {
    const rideToUpdate = rides.find(ride => ride.id === rideId);
    if (!rideToUpdate) return;
    
    if (rideToUpdate.status === 'cancelled' && newStatus === 'pending') {
        const { id, createdAt, updatedAt, assignedAt, pickedUpAt, droppedOffAt, cancelledAt, status, ...restOfRide } = rideToUpdate;
        const newRide: Omit<Ride, 'id'|'createdAt'|'updatedAt'> = {
            ...restOfRide,
            status: 'pending',
            driverId: null,
            isNew: true,
        };
        await addDoc(collection(db, 'rides'), {
            ...newRide,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        return;
    }

    const updateData: any = { status: newStatus, updatedAt: serverTimestamp() };

    if (newStatus === 'in-progress') updateData.pickedUpAt = serverTimestamp();
    else if (newStatus === 'completed') updateData.droppedOffAt = serverTimestamp();
    else if (newStatus === 'cancelled') {
      updateData.cancelledAt = serverTimestamp();
      updateData.driverId = null;
    }

    await updateDoc(doc(db, 'rides', rideId), updateData);

    if ((newStatus === 'completed' || newStatus === 'cancelled') && rideToUpdate.driverId) {
      const driverId = rideToUpdate.driverId;
      const remainingRides = rides.filter(r => r.driverId === driverId && r.id !== rideId && ['assigned', 'in-progress'].includes(r.status));
      if (remainingRides.length === 0) {
        await updateDoc(doc(db, 'drivers', driverId), { status: 'available' });
      }
    }
  };

  const handleSetFare = async (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number; card?: number; check?: number; tip?: number; } }) => {
    await updateDoc(doc(db, 'rides', rideId), {
        totalFare: details.totalFare,
        paymentDetails: details.paymentDetails,
        updatedAt: serverTimestamp(),
    });
  };
  
  const handleOpenEdit = (ride: Ride) => {
    setEditingRide(ride);
    setIsFormOpen(true);
  }

  const handleOpenLogNew = () => {
    setEditingRide(null);
    setIsFormOpen(true);
  }

  const handleSendMessage = async (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => {
    await addDoc(collection(db, 'messages'), {
        ...message,
        timestamp: serverTimestamp(),
        isRead: false,
    });
  };
  
  const handleMarkMessagesAsRead = async (driverId: string) => {
    const unreadMessages = messages.filter(m => m.driverId === driverId && m.sender === 'driver' && !m.isRead);
    for (const message of unreadMessages) {
        await updateDoc(doc(db, 'messages', message.id), { isRead: true });
    }
  };

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
                          onUnschedule={handleUnscheduleRide}
                        />
                      ))}
                      {provided.placeholder}
                    </CardContent>
                  </Card>
                )}
              </StrictModeDroppable>
            )}
            
            {/* Waiting Column */}
            <StrictModeDroppable droppableId="waiting" isDropDisabled={false}>
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
                      <Siren className="h-5 w-5 text-yellow-500" /> Waiting ({pendingRides.length})
                    </CardTitle>
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
                              onUnschedule={handleUnscheduleRide}
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
              <StrictModeDroppable droppableId="scheduled" isDropDisabled={false}>
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
                                onUnschedule={handleUnscheduleRide}
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
              messages={messages.filter(m => m.driverId === driver.id)}
              onAssignDriver={handleAssignDriver}
              onChangeStatus={handleChangeStatus}
              onSetFare={handleSetFare}
              onUnassignDriver={handleUnassignDriver}
              onEditRide={handleOpenEdit}
              onUnscheduleRide={handleUnscheduleRide}
              onSendMessage={handleSendMessage}
              onMarkMessagesAsRead={handleMarkMessagesAsRead}
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
                        onUnschedule={handleUnscheduleRide}
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
                          onUnschedule={handleUnscheduleRide}
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
                            messages={messages.filter(m => m.driverId === driver.id)}
                            onAssignDriver={handleAssignDriver}
                            onChangeStatus={handleChangeStatus}
                            onSetFare={handleSetFare}
                            onUnassignDriver={handleUnassignDriver}
                            onEditRide={handleOpenEdit}
                            onUnscheduleRide={handleUnscheduleRide}
                            onSendMessage={handleSendMessage}
                            onMarkMessagesAsRead={handleMarkMessagesAsRead}
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
            {time && <>{time.toLocaleDateString()} {time.toLocaleTimeString()}</>}
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
           <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut />
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
          {isMobile ? renderMobileView() : renderDesktopView()}
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
