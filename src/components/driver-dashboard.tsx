
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import type { Ride, Driver, Message, Shift, AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DriverRideCard } from './driver-ride-card';
import { CheckCircle, MessageCircle, LogOut, Users, X } from 'lucide-react';
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
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const getThreadId = (uid1: string, uid2: string) => {
    return [uid1, uid2].sort().join('-');
}

function DriverChatListDialog({ drivers, onSelectDriver, onClose }: { drivers: Driver[], onSelectDriver: (driver: Driver) => void, onClose: () => void }) {
    return (
        <ResponsiveDialog open={true} onOpenChange={(isOpen) => !isOpen && onClose()} title="Chat with another driver">
            <ScrollArea className="h-[60vh] p-2">
                <div className="space-y-2">
                {drivers.map(driver => (
                    <Button key={driver.id} variant="ghost" className="w-full justify-start h-14" onClick={() => onSelectDriver(driver)}>
                         <Avatar className="h-10 w-10 mr-4">
                            <AvatarImage src={`https://i.pravatar.cc/40?u=${driver.id}`} />
                            <AvatarFallback>{driver.name?.[0] || 'D'}</AvatarFallback>
                        </Avatar>
                        <span className="text-left">{formatUserName(driver.name)}</span>
                    </Button>
                ))}
                </div>
            </ScrollArea>
        </ResponsiveDialog>
    )
}

export function DriverDashboard() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [currentDriver, setCurrentDriver] = useState<Driver | null>(null);
  const [allDrivers, setAllDrivers] = useState<Driver[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  
  const [chatParticipant, setChatParticipant] = useState<Driver | AppUser | null>(null);
  const [isDriverListOpen, setIsDriverListOpen] = useState(false);
  
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
            assignedAt: toDate(doc.data().assignedAt),
            pickedUpAt: toDate(doc.data().pickedUpAt),
            droppedOffAt: toDate(doc.data().droppedOffAt),
            cancelledAt: toDate(doc.data().cancelledAt),
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

    // Listen to all threads the current driver is a part of
    const messagesQuery = query(
      collection(db, "messages"),
      where("threadId", "array-contains", currentDriver.id),
      orderBy("timestamp", "asc")
    );
    
    const messagesUnsub = onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = snapshot.docs.map(doc => ({
            ...doc.data(), id: doc.id, timestamp: toDate(doc.data().timestamp)
        } as Message));

        if (prevMessagesRef.current.length > 0 && newMessages.length > prevMessagesRef.current.length) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.recipientId === currentDriver.id) {
                const senderName = allDrivers.find(d => d.id === lastMessage.senderId)?.name || 'Dispatch';
                sendBrowserNotification(
                    `New message from ${formatUserName(senderName)}`,
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
  }, [currentDriver, allDrivers]);


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

  const dispatcherUser: AppUser = useMemo(() => {
    return {
        id: 'dispatcher-main', // a static ID for the dispatcher entity
        uid: 'dispatcher-main',
        name: 'Dispatch',
        displayName: 'Dispatch',
        email: '',
        role: 2,
    };
  }, []);

  const getUnreadCount = (participantId: string) => {
    if (!currentDriver) return 0;
    const threadId = getThreadId(currentDriver.id, participantId);
    return messages.filter(m => m.threadId === threadId && m.recipientId === currentDriver.id && !m.isRead).length;
  }
  
  const totalUnread = useMemo(() => {
    if(!currentDriver) return 0;
    return messages.filter(m => m.recipientId === currentDriver.id && !m.isRead).length;
  }, [messages, currentDriver]);

  
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
  
  const openChatWith = async (participant: Driver | AppUser) => {
    if(!currentDriver) return;

    setChatParticipant(participant);
    const threadId = getThreadId(currentDriver.id, participant.id);
    const batch = writeBatch(db);
    const unread = messages.filter(m => m.threadId === threadId && m.recipientId === currentDriver.id && !m.isRead);
    
    unread.forEach(message => {
        const msgRef = doc(db, 'messages', message.id);
        batch.update(msgRef, { isRead: true });
    });
    await batch.commit();
  };

  const handleSelectDriverToChat = (driver: Driver) => {
      setIsDriverListOpen(false);
      openChatWith(driver);
  }

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

      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-3">
          <Button
            variant="secondary"
            size="lg"
            className="h-14 w-14 rounded-full shadow-lg p-0"
            onClick={() => setIsDriverListOpen(true)}
          >
            <Users className="h-7 w-7" />
            <span className="sr-only">Chat with other drivers</span>
          </Button>
          <Button
            variant="default"
            size="lg"
            className="h-16 w-16 rounded-full shadow-lg p-0"
            onClick={() => openChatWith(dispatcherUser)}
          >
            <MessageCircle className="h-8 w-8" />
            {totalUnread > 0 && (
              <Badge className="absolute -top-1 -right-1 h-6 w-6 justify-center p-0">{totalUnread}</Badge>
            )}
            <span className="sr-only">Open Chat with Dispatch</span>
          </Button>
      </div>

      
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
      
      {isDriverListOpen && (
          <DriverChatListDialog 
            drivers={allDrivers.filter(d => d.id !== currentDriver.id)}
            onSelectDriver={handleSelectDriverToChat}
            onClose={() => setIsDriverListOpen(false)}
          />
      )}

      {chatParticipant && (
        <ResponsiveDialog
            open={!!chatParticipant}
            onOpenChange={(isOpen) => !isOpen && setChatParticipant(null)}
            title={`Chat with ${formatUserName(chatParticipant.name || (chatParticipant as AppUser).displayName || 'User')}`}
        >
          <ChatView
            threadId={getThreadId(currentDriver.id, chatParticipant.id)}
            participant={chatParticipant}
            messages={messages.filter(m => m.threadId === getThreadId(currentDriver.id, chatParticipant.id))}
            allDrivers={allDrivers}
            onSendMessage={handleSendMessage}
          />
      </ResponsiveDialog>
      )}

    </div>
  );
}
