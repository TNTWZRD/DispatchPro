

"use client";

import React, { useState, useEffect, useCallback, useContext } from 'react';
import type { Ride, Driver, RideStatus, Message, Shift, Vehicle } from '@/lib/types';
import { Role } from '@/lib/types';
import { DragDropContext, Draggable, type DropResult } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RideCard } from './ride-card';
import { CallLoggerForm } from './call-logger-form';
import { VoiceControl } from './voice-control';
import { Truck, PlusCircle, ZoomIn, ZoomOut, Minimize2, Maximize2, Calendar, History, XCircle, Siren, LogOut, Shield } from 'lucide-react';
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
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, query, orderBy, Timestamp } from 'firebase/firestore';


function DispatchDashboardUI() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeTab, setActiveTab] = useState('waiting');
  const [showCancelled, setShowCancelled] = useState(false);
  
  const { user, hasRole } = useAuth();
  const isMobile = useIsMobile();
  
  const { zoom, zoomIn, zoomOut } = useContext(ZoomContext);
  const { isCondensed, toggleCondensedMode } = useCondensedMode();

  useHotkey('s', toggleCondensedMode, { alt: true });

  useEffect(() => {
    if (!user) return;
    
    const toDate = (ts: any) => ts instanceof Timestamp ? ts.toDate() : ts;

    const ridesUnsub = onSnapshot(query(collection(db, "rides"), orderBy("createdAt", "desc")), (snapshot) => {
        const ridesData = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            createdAt: toDate(doc.data().createdAt),
            updatedAt: toDate(doc.data().updatedAt),
            scheduledTime: doc.data().scheduledTime ? toDate(doc.data().scheduledTime) : undefined,
            assignedAt: doc.data().assignedAt ? toDate(doc.data().assignedAt) : undefined,
            pickedUpAt: doc.data().pickedUpAt ? toDate(doc.data().pickedUpAt) : undefined,
            droppedOffAt: doc.data().droppedOffAt ? toDate(doc.data().droppedOffAt) : undefined,
            cancelledAt: doc.data().cancelledAt ? toDate(doc.data().cancelledAt) : undefined,
        } as Ride));
        setRides(ridesData);
    });

    const driversUnsub = onSnapshot(collection(db, "drivers"), (snapshot) => {
        setDrivers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Driver)));
    });
    
    const vehiclesUnsub = onSnapshot(collection(db, "vehicles"), (snapshot) => {
        setVehicles(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Vehicle)));
    });

    const shiftsUnsub = onSnapshot(collection(db, "shifts"), (snapshot) => {
        setShifts(snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          startTime: toDate(doc.data().startTime),
          endTime: doc.data().endTime ? toDate(doc.data().endTime) : undefined,
        } as Shift)));
    });

    const messagesUnsub = onSnapshot(collection(db, "messages"), (snapshot) => {
        setMessages(snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            timestamp: toDate(doc.data().timestamp),
        } as Message)));
    });


    return () => {
        ridesUnsub();
        driversUnsub();
        vehiclesUnsub();
        shiftsUnsub();
        messagesUnsub();
    };
  }, [user]);
  
  const activeShifts = shifts
    .filter(s => s.status === 'active')
    .map(shift => {
        const driver = drivers.find(d => d.id === shift.driverId);
        const vehicle = vehicles.find(v => v.id === shift.vehicleId);
        return { ...shift, driver, vehicle };
    })
    .filter(s => s.driver && s.vehicle);
    
  
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
    tabs.push(...activeShifts.map(s => s.id));
    const tabIndex = tabs.indexOf(value);

    if (carouselApi && tabIndex !== -1) {
      carouselApi.scrollTo(tabIndex);
    }
  }, [carouselApi, activeShifts, hasScheduledRides]);


  useEffect(() => {
    if (!carouselApi) return;
    
    const onSelect = () => {
      const selectedIndex = carouselApi.selectedScrollSnap();
      const tabs = ['waiting'];
      if (hasScheduledRides) tabs.push('scheduled');
      tabs.push(...activeShifts.map(d => d.id));
      const newTab = tabs[selectedIndex];

      if (newTab) {
        setActiveTab(newTab);
      }
    };

    carouselApi.on("select", onSelect);
    return () => {
      carouselApi.off("select", onSelect);
    };
  }, [carouselApi, activeShifts, hasScheduledRides]);

  const handleAddRide = async (newRideData: Omit<Ride, 'id' | 'status' | 'driverId' | 'createdAt' | 'updatedAt' | 'isNew' | 'shiftId'>) => {
    if (!db) return;
    
    const rideToSave = {
        ...newRideData,
        scheduledTime: newRideData.scheduledTime || null,
    };

    const newRide: Omit<Ride, 'id'> = {
      ...rideToSave,
      status: 'pending',
      driverId: null,
      shiftId: null,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any,
      isNew: true,
    };
    const docRef = await addDoc(collection(db, 'rides'), newRide);
    setIsFormOpen(false);
    
    setTimeout(async () => {
        if (!db) return;
        await updateDoc(doc(db, 'rides', docRef.id), { isNew: false });
    }, 5000);
  };
  
  const handleEditRide = async (updatedRide: Ride) => {
    if (!db) return;
    const { id, ...rideData } = updatedRide;
    await updateDoc(doc(db, 'rides', id), {
        ...rideData,
        updatedAt: serverTimestamp()
    });
    setEditingRide(null);
    setIsFormOpen(false);
  }

  const handleAssignDriver = async (rideId: string, shiftId: string) => {
    if (!db) return;
    const rideToAssign = rides.find(r => r.id === rideId);
    if (!rideToAssign) return;

    const shift = activeShifts.find(s => s.id === shiftId);
    if (!shift || !shift.driver) return;

    await updateDoc(doc(db, 'rides', rideId), {
        status: 'assigned',
        driverId: shift.driverId,
        shiftId: shift.id,
        updatedAt: serverTimestamp(),
        assignedAt: serverTimestamp()
    });
  };
  
  const handleUnassignDriver = async (rideId: string) => {
    if (!db) return;
    const ride = rides.find(r => r.id === rideId);
    if (!ride || !ride.driverId) return;

    await updateDoc(doc(db, 'rides', rideId), {
        status: 'pending',
        driverId: null,
        shiftId: null,
        updatedAt: serverTimestamp(),
        assignedAt: null
    });
  };

  const handleUnscheduleRide = async (rideId: string) => {
    if (!db) return;
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

    if (destination.droppableId.startsWith('shift-')) {
      const shiftId = destination.droppableId.split('shift-')[1];
      handleAssignDriver(ride.id, shiftId);
    } else if (destination.droppableId === 'waiting' || destination.droppableId === 'scheduled') {
      if (ride.driverId) {
        handleUnassignDriver(ride.id);
      }
    }
  };


  const handleChangeStatus = async (rideId: string, newStatus: RideStatus) => {
    if (!db) return;
    const rideToUpdate = rides.find(ride => ride.id === rideId);
    if (!rideToUpdate) return;
    
    if (rideToUpdate.status === 'cancelled' && newStatus === 'pending') {
        const { id, createdAt, updatedAt, assignedAt, pickedUpAt, droppedOffAt, cancelledAt, status, ...restOfRide } = rideToUpdate;
        const newRide: Omit<Ride, 'id'|'createdAt'|'updatedAt'> = {
            ...restOfRide,
            status: 'pending',
            driverId: null,
            shiftId: null,
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
      updateData.shiftId = null;
    }

    await updateDoc(doc(db, 'rides', rideId), updateData);
  };

  const handleSetFare = async (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number; card?: number; check?: number; tip?: number; } }) => {
    if (!db) return;
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
    if (!db) return;
    await addDoc(collection(db, 'messages'), {
        ...message,
        timestamp: serverTimestamp(),
        isRead: false,
    });
  };
  
  const handleMarkMessagesAsRead = async (driverId: string) => {
    if (!db) return;
    const unreadMessages = messages.filter(m => m.driverId === driverId && m.sender === 'driver' && !m.isRead);
    for (const message of unreadMessages) {
        await updateDoc(doc(db, 'messages', message.id), { isRead: true });
    }
  };
  
  const canAdmin = hasRole(Role.ADMIN) || hasRole(Role.OWNER);

  const renderDesktopView = () => {
    return (
     <DragDropContext onDragEnd={onDragEnd}>
        <div 
          className="flex-1 flex items-stretch gap-2 overflow-x-auto pb-2 transition-transform origin-top-left"
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
                    className="shrink-0 flex flex-col bg-muted/50 w-full lg:w-[350px] xl:w-[400px]"
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
                          shifts={activeShifts}
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
                    "shrink-0 flex flex-col w-full lg:w-[350px] xl:w-[400px]",
                    snapshot.isDraggingOver && "bg-accent/20"
                  )}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Siren className="h-5 w-5 text-yellow-500" /> Waiting ({pendingRides.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                    {pendingRides.map((ride, index) => (
                      <Draggable key={ride.id} draggableId={ride.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <RideCard
                              ride={ride}
                              shifts={activeShifts}
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
                      "shrink-0 flex flex-col w-full lg:w-[350px] xl:w-[400px]",
                      snapshot.isDraggingOver && "bg-accent/20"
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Calendar className="h-5 w-5" /> Scheduled ({scheduledRides.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-2 space-y-2">
                      {scheduledRides.map((ride, index) => (
                        <Draggable key={ride.id} draggableId={ride.id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <RideCard
                                ride={ride}
                                shifts={activeShifts}
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
          {activeShifts.map(shift => (
            <DriverColumn
              key={shift.id}
              shift={shift}
              rides={rides.filter(r => ['assigned', 'in-progress', 'completed'].includes(r.status) && r.shiftId === shift.id)}
              allShifts={activeShifts}
              messages={messages.filter(m => m.driverId === shift.driverId)}
              onAssignDriver={handleAssignDriver}
              onChangeStatus={handleChangeStatus}
              onSetFare={handleSetFare}
              onUnassignDriver={handleUnassignDriver}
              onEditRide={handleOpenEdit}
              onUnscheduleRide={handleUnscheduleRide}
              onSendMessage={handleSendMessage}
              onMarkMessagesAsRead={handleMarkMessagesAsRead}
              className="w-full lg:w-[350px] xl:w-[400px]"
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
          {activeShifts.map(shift => (
            <TabsTrigger key={shift.id} value={shift.id}>{shift.driver?.name.split(' ')[0]}</TabsTrigger>
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
                        shifts={activeShifts}
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
                          shifts={activeShifts}
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
                {activeShifts.map(shift => (
                  <CarouselItem key={shift.id} className="overflow-y-auto">
                      <div className="pr-1">
                        <DriverColumn
                            shift={shift}
                            rides={rides.filter(r => ['assigned', 'in-progress', 'completed'].includes(r.status) && r.shiftId === shift.id)}
                            allShifts={activeShifts}
                            messages={messages.filter(m => m.driverId === shift.driverId)}
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
    <div className="flex h-full flex-col bg-secondary/50">
      <div className="flex h-16 shrink-0 items-center border-b bg-card px-6 shadow-sm">
        <div className="flex items-center gap-2">
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
        <div className="ml-auto items-center gap-2 hidden md:flex">
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
      </div>

      <div className="flex flex-1 flex-row gap-4 overflow-hidden p-2">
        <Sidebar 
            rides={rides} 
            drivers={drivers}
            onAssignSuggestion={handleAssignDriver} 
        />
        
        <div className='flex-1 flex flex-col min-w-0'>
          {isMobile ? renderMobileView() : renderDesktopView()}
        </div>
      </div>
      <VoiceControl
          rides={rides}
          drivers={drivers}
          onAddRide={handleAddRide}
          onAssignDriver={(rideId, driverId) => {
            const driver = drivers.find(d => d.id === driverId);
            if (driver && driver.currentShiftId) {
                handleAssignDriver(rideId, driver.currentShiftId);
            }
          }}
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
