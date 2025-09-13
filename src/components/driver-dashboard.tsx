

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Ride, Driver, Message, Shift, AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverRideCard } from './driver-ride-card';
import { CheckCircle, MessageCircle, LogOut } from 'lucide-react';
import { Separator } from './ui/separator';
import { ResponsiveDialog } from './responsive-dialog';
import { DriverEditForm } from './driver-edit-form';
import { ChatView } from './chat-view';
import { Button } from './ui/button';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, addDoc, serverTimestamp, getDoc, Timestamp, orderBy, writeBatch } from 'firebase/firestore';
import { sendBrowserNotification } from '@/lib/notifications';
import { formatUserName } from '@/lib/utils';
import { Badge } from './ui/badge';

export function DriverDashboard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const { user, logout } = useAuth();
  
  const toDate = (ts: any) => ts instanceof Timestamp ? ts.toDate() : ts;
  
  const prevRidesRef = React.useRef<Ride[]>([]);
  const prevMessagesRef = React.useRef<Message[]>([]);

  useEffect(() => {
    prevRidesRef.current = rides;
    prevMessagesRef.current = messages;
  }, [rides, messages]);

  useEffect(() => {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
    } else if (Notification.permission === "default") {
        Notification.requestPermission();
    }
  }, []);
  
  useEffect(() => {
    const driversUnsub = onSnapshot(collection(db, "drivers"), (snapshot) => {
        setAllDrivers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Driver)));
    });
    return () => driversUnsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const driverRef = doc(db, "drivers", user.uid);
    const unsubDriver = onSnapshot(driverRef, (doc) => {
        if (doc.exists()) {
            setCurrentDriver({ ...doc.data(), id: doc.id } as Driver);
        } else {
            setCurrentDriver(null);
        }
    });

    return () => unsubDriver();
  }, [user]);

  useEffect(() => {
    if (!currentDriver) return;

    const ridesQuery = query(collection(db, "rides"), where("driverId", "==", currentDriver.id));
    const ridesUnsub = onSnapshot(ridesQuery, (snapshot) => {
        const newRides = snapshot.docs.map(doc => ({
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
        
        if (prevRidesRef.current.length > 0 && newRides.length > prevRidesRef.current.length) {
            const assignedRide = newRides.find(nr => !prevRidesRef.current.some(pr => pr.id === nr.id) && nr.status === 'assigned');
            if (assignedRide) {
                sendBrowserNotification(
                    "New ride assigned!", 
                    `Pickup at: ${assignedRide.pickup.name}`
                );
            }
        }
        setRides(newRides);
    });

    const messagesQuery = query(
      collection(db, "messages"),
      where("recipientId", "==", currentDriver.id),
      orderBy("timestamp", "asc")
    );
    const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            timestamp: toDate(doc.data().timestamp),
        } as Message));

        if (prevMessagesRef.current.length > 0 && newMessages.length > prevMessagesRef.current.length) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.sender === 'dispatcher') {
                sendBrowserNotification(
                    "New message from Dispatch",
                    lastMessage.text || "Sent an image or audio"
                );
            }
        }
        setMessages(newMessages);
    });

    return () => {
        ridesUnsub();
        messagesUnsub();
    }
  }, [currentDriver]);


  const driverRides = useMemo(() => {
    if (!currentDriver) return [];
    return rides
      .filter(r => ['assigned', 'in-progress'].includes(r.status))
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

  const dispatcherUser: AppUser = useMemo(() => ({
    id: 'dispatcher',
    uid: 'dispatcher',
    name: 'Dispatch',
    email: '',
    role: 2,
  }), []);

  const driverMessages = useMemo(() => {
    if (!currentDriver) return [];
    return messages.filter(m => 
        (m.senderId === currentDriver.id && m.recipientId === dispatcherUser.id) ||
        (m.senderId === dispatcherUser.id && m.recipientId === currentDriver.id)
    );
  }, [messages, currentDriver, dispatcherUser.id]);


  const unreadMessagesCount = useMemo(() => {
    if (!currentDriver) return 0;
    return driverMessages.filter(m => m.recipientId === currentDriver.id && !m.isRead).length;
  }, [driverMessages, currentDriver]);
  
  const handleEditRide = async (rideId: string, details: { cashTip?: number, notes?: string }) => {
    const rideToUpdate = rides.find(ride => ride.id === rideId);
    if (!rideToUpdate) return;
    
    const newPaymentDetails = { ...(rideToUpdate.paymentDetails || {}), cashTip: details.cashTip };
    const newNotes = details.notes;

    await updateDoc(doc(db, 'rides', rideId), {
        notes: newNotes,
        paymentDetails: newPaymentDetails,
        updatedAt: serverTimestamp()
    });

    setEditingRide(null);
  };
  
  const handleOpenEdit = (ride: Ride) => {
    setEditingRide(ride);
  }

  const handleSendMessage = async (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => {
    await addDoc(collection(db, 'messages'), {
        ...message,
        timestamp: serverTimestamp(),
        isRead: false,
    });
  };
  
  const handleChatOpen = async (isOpen: boolean) => {
    if(isOpen && currentDriver) {
        const batch = writeBatch(db);
        const unread = driverMessages.filter(m => m.recipientId === currentDriver.id && !m.isRead);
        unread.forEach(message => {
            const msgRef = doc(db, 'messages', message.id);
            batch.update(msgRef, { isRead: true });
        });
        await batch.commit();
    }
    setIsChatOpen(isOpen);
  };

  if (!currentDriver) {
    return (
      <div className="flex h-full items-center justify-center bg-secondary p-4 text-center">
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
    <div className="h-full flex flex-col bg-secondary/50">
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24">
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

      <Button
        variant="default"
        size="lg"
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50 p-0"
        onClick={() => handleChatOpen(true)}
      >
        <MessageCircle className="h-8 w-8" />
        {unreadMessagesCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-6 w-6 justify-center p-0">{unreadMessagesCount}</Badge>
        )}
        <span className="sr-only">Open Chat</span>
      </Button>
      
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
        title={`Chat with ${dispatcherUser.name}`}
      >
          <ChatView
            threadId={currentDriver.id}
            participant={dispatcherUser}
            messages={driverMessages}
            allDrivers={allDrivers}
            onSendMessage={handleSendMessage}
          />
      </ResponsiveDialog>
    </div>
  );
}
