

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { initialRides, initialDrivers, initialMessages } from '@/lib/data';
import type { Ride, Driver, Message } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverRideCard } from './driver-ride-card';
import { Truck, CheckCircle, MessageCircle, LogOut } from 'lucide-react';
import { Separator } from './ui/separator';
import { ResponsiveDialog } from './responsive-dialog';
import { DriverEditForm } from './driver-edit-form';
import { ChatView } from './chat-view';
import { Button } from './ui/button';
import { useAuth } from '@/context/auth-context';

export function DriverDashboard() {
  const [rides, setRides] = useState<Ride[]>(initialRides);
  const [drivers, setDrivers] = useState<Driver[]>(initialDrivers);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const { user, logout } = useAuth();

  // In a real app, you'd get this from auth and a database lookup
  // We find a driver whose name might be in the user's display name or email
  const currentDriver = useMemo(() => {
    if (!user) return null;
    return drivers.find(d => user.displayName?.includes(d.name.split(' ')[0]) || user.email?.includes(d.name.split(' ')[0].toLowerCase()));
  }, [drivers, user]);


  const driverRides = useMemo(() => {
    if (!currentDriver) return [];
    return rides
      .filter(r => r.driverId === currentDriver.id && ['assigned', 'in-progress'].includes(r.status))
      .sort((a, b) => {
        if (a.status === 'in-progress') return -1;
        if (b.status === 'in-progress') return 1;
        return (a.assignedAt?.getTime() ?? 0) - (b.assignedAt?.getTime() ?? 0);
      });
  }, [rides, currentDriver]);

  const completedRides = useMemo(() => {
    if (!currentDriver) return [];
    return rides
      .filter(r => r.driverId === currentDriver.id && r.status === 'completed')
      .sort((a,b) => (b.droppedOffAt?.getTime() ?? 0) - (a.droppedOffAt?.getTime() ?? 0));
  }, [rides, currentDriver]);

  const currentRide = useMemo(() => {
    return driverRides.find(r => r.status === 'in-progress') || driverRides[0] || null;
  }, [driverRides]);
  
  const upcomingRides = useMemo(() => {
    return driverRides.filter(r => r.id !== currentRide?.id)
  }, [driverRides, currentRide]);

  const driverMessages = useMemo(() => {
    if (!currentDriver) return [];
    return messages.filter(m => m.driverId === currentDriver.id);
  }, [messages, currentDriver]);

  const unreadMessagesCount = useMemo(() => {
    return driverMessages.filter(m => m.sender === 'dispatcher' && !m.isRead).length;
  }, [driverMessages]);
  
  const handleEditRide = (rideId: string, details: { cashTip?: number, notes?: string }) => {
    setRides(prevRides =>
      prevRides.map(ride => {
        if (ride.id !== rideId) return ride;
        
        const newPaymentDetails = { ...(ride.paymentDetails || {}), cashTip: details.cashTip };
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

  const handleSendMessage = (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => {
    const newMessage: Message = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: new Date(),
      isRead: true, // Messages sent by self are always read
    };
    setMessages(prev => [...prev, newMessage]);
  };
  
  const handleChatOpen = (isOpen: boolean) => {
    if(isOpen) {
        if (!currentDriver) return;
        // Mark messages from dispatcher as read
        setMessages(prev => prev.map(m => (
            m.driverId === currentDriver.id && m.sender === 'dispatcher' ? { ...m, isRead: true } : m
        )));
    }
    setIsChatOpen(isOpen);
  };

  if (!currentDriver) {
    return (
      <div className="flex h-screen items-center justify-center bg-secondary p-4 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Driver Profile Not Found</CardTitle>
            <CardDescription>We could not find a driver profile associated with your account ({user?.email}). Please contact your dispatcher.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={logout}>
              <LogOut className="mr-2"/> Sign Out
            </Button>
          </CardContent>
        </Card>
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
          <Button variant="outline" className="relative" onClick={() => handleChatOpen(true)}>
            <MessageCircle className="mr-2" /> Chat
            {unreadMessagesCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                {unreadMessagesCount}
                </span>
            )}
          </Button>
          <div className="text-right">
            <div className="font-semibold">{currentDriver.name}</div>
            <div className="text-xs text-muted-foreground">{currentDriver.vehicle}</div>
          </div>
          <Avatar>
            <AvatarImage src={`https://i.pravatar.cc/40?u=${currentDriver.id}`} />
            <AvatarFallback>{currentDriver.name.charAt(0)}</AvatarFallback>
          </Avatar>
           <Button variant="ghost" size="icon" onClick={logout}>
              <LogOut />
           </Button>
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
      
      <ResponsiveDialog
        open={isChatOpen}
        onOpenChange={handleChatOpen}
        title={`Chat with Dispatch`}
      >
          <ChatView
            messages={driverMessages}
            onSendMessage={handleSendMessage}
            sender='driver'
            driverId={currentDriver.id}
            driverName="Me"
          />
      </ResponsiveDialog>
    </div>
  );
}
