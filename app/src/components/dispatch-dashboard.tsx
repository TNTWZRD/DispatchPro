

"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Ride, Driver, RideStatus, Message, Shift, Vehicle, AppUser, Ban } from '@/lib/types';
import { Role, DISPATCHER_ID, dispatcherUser } from '@/lib/types';
import { DragDropContext, type DropResult, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RideCard } from './ride-card';
import { CallLoggerForm } from './call-logger-form';
import { VoiceControl } from './voice-control';
import { PlusCircle, ZoomIn, ZoomOut, Minimize2, Maximize2, Calendar, History, XCircle, Siren, Briefcase, Mail, MessageSquare, Star, ArrowLeft, ShieldCheck } from 'lucide-react';
import { cn, getThreadIds, formatUserName } from '@/lib/utils';
import { DriverColumn } from './driver-column';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StrictModeDroppable } from './strict-mode-droppable';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@/components/ui/carousel';
import { ZoomProvider, ZoomContext } from '@/context/zoom-context';
import { CondensedModeProvider, useCondensedMode } from '@/context/condensed-mode-context';
import { useHotkey } from '@/hooks/use-hotkey';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { ResponsiveDialog } from './responsive-dialog';
import { useAuth } from '@/context/auth-context';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, where, query, or, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import { StartShiftForm } from './start-shift-form';
import { endShift } from '@/app/admin/actions';
import { toggleStarMessage } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { sendBrowserNotification } from '@/lib/notifications';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { ChatView } from './chat-view';
import { Separator } from './ui/separator';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { ShiftNotesForm } from './shift-notes-form';
import { VehicleNotesForm } from './vehicle-notes-form';
import { EditShiftForm } from './edit-shift-form';
import { BanCheckDialog } from './ban-check-dialog';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { updateUserProfile } from '@/app/settings/actions';


function DispatchDashboardUI() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isShiftFormOpen, setIsShiftFormOpen] = useState(false);
  const [isBanCheckOpen, setIsBanCheckOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isChatDirectoryOpen, setIsChatDirectoryOpen] = useState(false);
  const [currentChatTarget, setCurrentChatTarget] = useState<AppUser | Driver | null>(null);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [activeTab, setActiveTab] = useState('waiting');
  const [showCancelled, setShowCancelled] = useState(false);
  
  const { user, hasRole } = useAuth();
  const [isNotificationToggleChecked, setIsNotificationToggleChecked] = useState(user?.settings?.sendAssignmentNotifications ?? true);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const { zoom, zoomIn, zoomOut } = React.useContext(ZoomContext);
  const { isCondensed, toggleCondensedMode } = useCondensedMode();
  
  const prevMessagesRef = React.useRef<Message[]>([]);

  useHotkey('s', toggleCondensedMode, { alt: true });

  useEffect(() => {
    setIsNotificationToggleChecked(user?.settings?.sendAssignmentNotifications ?? true);
  }, [user]);
  
  useEffect(() => {
    prevMessagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
    } else if (Notification.permission === "default") {
        Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const toDate = (ts: any) => ts instanceof Timestamp ? ts.toDate() : ts;

    const unsubscribers = [
      onSnapshot(collection(db, "rides"), (snapshot) => {
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
      }),
      onSnapshot(collection(db, "drivers"), (snapshot) => {
          setDrivers(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Driver)));
      }),
      onSnapshot(collection(db, 'users'), (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            id: doc.id,
            uid: doc.id,
            name: data.displayName,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          } as AppUser;
        }));
      }),
      onSnapshot(collection(db, "vehicles"), (snapshot) => {
          setVehicles(snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as Vehicle)));
      }),
      onSnapshot(collection(db, "shifts"), (snapshot) => {
          setShifts(snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            startTime: toDate(doc.data().startTime),
            endTime: doc.data().endTime ? toDate(doc.data().endTime) : undefined,
          } as Shift)));
      }),
       onSnapshot(collection(db, "bans"), (snapshot) => {
        setBans(snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          createdAt: toDate(doc.data().createdAt),
        } as Ban)));
      }),
    ];
    
    const messagesQuery = query(
      collection(db, "messages"),
      or(
        where("threadId", "array-contains", user.uid),
        // If user is a dispatcher, they also need to see all dispatcher logs
        hasRole(Role.DISPATCHER) ? where("threadId", "array-contains", DISPATCHER_ID) : where("recipientId", "==", user.uid)
      )
    );

    const unsubMessages = onSnapshot(messagesQuery, (snapshot) => {
        const allMessages = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, timestamp: toDate(doc.data().timestamp) } as Message));
        
        const newIncomingMessages = allMessages.filter(m => m.recipientId === user.uid && !m.isReadBy?.includes(user.uid));
        
        if (prevMessagesRef.current.length > 0 && newIncomingMessages.length > prevMessagesRef.current.filter(m => m.recipientId === user.uid && !m.isReadBy?.includes(user.uid)).length) {
            const lastMessage = newIncomingMessages.sort((a,b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0))[0];
            if (lastMessage) {
                const sender = allUsers.find(u => u.id === lastMessage.senderId);
                sendBrowserNotification(
                    `New message from ${formatUserName(sender?.name, sender?.email)}`,
                    lastMessage.text || "Sent an image or audio"
                );
            }
        }
        
        const sortedMessages = allMessages
          .filter(m => m.timestamp)
          .sort((a, b) => (a.timestamp?.getTime() ?? 0) - (b.timestamp?.getTime() ?? 0));

        setMessages(sortedMessages);
    });

    unsubscribers.push(unsubMessages);

    return () => {
        unsubscribers.forEach(unsub => unsub());
    };
  }, [user, hasRole]);
  
  const activeShifts = useMemo(() => shifts
    .filter(s => s.status === 'active')
    .map(shift => {
        const driver = drivers.find(d => d.id === shift.driverId);
        const vehicle = vehicles.find(v => v.id === shift.vehicleId);
        const completedRides = rides.filter(ride => 
          ride.shiftId === shift.id && 
          ride.status === 'completed' &&
          ride.droppedOffAt &&
          ride.droppedOffAt >= shift.startTime &&
          (!shift.endTime || ride.droppedOffAt <= shift.endTime)
      );
      const totalFare = completedRides.reduce((sum, ride) => sum + (ride.totalFare || 0), 0);

        return { ...shift, driver, vehicle, totalFare };
    })
    .filter(s => s.driver && s.vehicle), [shifts, drivers, vehicles, rides]);

  const { p2pMessages, dispatchChannelMessages } = useMemo(() => {
    if (!user) return { p2pMessages: [], dispatchChannelMessages: [] };

    const p2p: Message[] = [];
    const dispatchLog: Message[] = [];

    messages.forEach(m => {
        if (!m.threadId || m.threadId.length !== 2) return;
        
        if (m.threadId.includes(DISPATCHER_ID)) {
          dispatchLog.push(m);
        } else if (m.threadId.includes(user.uid)) {
          p2p.push(m);
        }
    });

    return { p2pMessages: p2p, dispatchChannelMessages: dispatchLog };
  }, [messages, user]);
  
 const chatDirectory = useMemo(() => {
    if (!user) return { p2pContacts: [], dispatchLogContacts: [], totalUnread: 0 };
    
    type ContactEntry = { user: AppUser | Driver, unread: number, hasStarred: boolean, lastMessage?: Message };
    const p2pContactsMap = new Map<string, ContactEntry>();
    const dispatchLogContactsMap = new Map<string, ContactEntry>();
    
    const allDispatcherUsers = allUsers.filter(u => u.role & Role.DISPATCHER);
    const dispatcherUserIds = allDispatcherUsers.map(u => u.id);

    const allPossibleContacts = [...allUsers, ...drivers.filter(d => !allUsers.some(u => u.id === d.id))];
    const uniqueContacts = Array.from(new Map(allPossibleContacts.map(item => [item.id, item])).values());
    
    // Setup P2P contacts
    p2pMessages.forEach(msg => {
      const contactId = msg.senderId === user.uid ? msg.recipientId : msg.senderId;
      if (contactId === user.uid) return;

      if (!p2pContactsMap.has(contactId)) {
        const contactUser = uniqueContacts.find(u => u.id === contactId);
        if (contactUser) {
           const driverInfo = drivers.find(d => d.id === contactId);
           const fullContactUser = { ...contactUser, status: driverInfo?.status || 'offline' } as AppUser & { status: Driver['status']};
           p2pContactsMap.set(contactId, { user: fullContactUser, unread: 0, hasStarred: false });
        }
      }
      
      const contact = p2pContactsMap.get(contactId);
      if(contact) {
        if (msg.recipientId === user.uid && !msg.isReadBy?.includes(user.uid)) {
            contact.unread++;
        }
        if (!contact.lastMessage || msg.timestamp > contact.lastMessage.timestamp) {
            contact.lastMessage = msg;
        }
      }
    });

    // Setup Dispatch Log contacts
    dispatchChannelMessages.forEach(msg => {
      const otherUserId = msg.threadId.find(id => id !== DISPATCHER_ID);
      if (!otherUserId) return;

      const hasBeenReadByAnyDispatcher = msg.isReadBy?.some(readerId => dispatcherUserIds.includes(readerId));
      
      let contactEntry: ContactEntry | undefined;

      // Handle "My Dispatch Log" for the current dispatcher
      if (otherUserId === user.uid) { 
        contactEntry = dispatchLogContactsMap.get(user.uid);
        if (!contactEntry) {
          const selfUser = { ...user, name: "My Dispatch Log" } as AppUser;
          contactEntry = { user: selfUser, unread: 0, hasStarred: false };
          dispatchLogContactsMap.set(user.uid, contactEntry);
        }
        // Only count unread if it comes FROM dispatch, not from self
        if (msg.senderId === DISPATCHER_ID && !msg.isReadBy?.includes(user.uid)) {
          contactEntry.unread++;
        }
      } else {
        contactEntry = dispatchLogContactsMap.get(otherUserId);
        if (!contactEntry) {
          const contactUser = uniqueContacts.find(u => u.id === otherUserId);
          if (contactUser) {
            const driverInfo = drivers.find(d => d.id === contactUser.id);
            const fullContactUser = { ...contactUser, status: driverInfo?.status || 'offline' } as AppUser & { status: Driver['status'] };
            contactEntry = { user: fullContactUser, unread: 0, hasStarred: false };
            dispatchLogContactsMap.set(otherUserId, contactEntry);
          }
        }
        // A message is unread if it's starred OR if no dispatcher has read it yet
        if (contactEntry && (msg.isStarred || !hasBeenReadByAnyDispatcher)) {
            contactEntry.unread++;
        }
      }

      if (contactEntry) {
          if (msg.isStarred) contactEntry.hasStarred = true;
          if (!contactEntry.lastMessage || msg.timestamp > contactEntry.lastMessage.timestamp) {
              contactEntry.lastMessage = msg;
          }
      }
    });
    
    // Ensure the current user always appears in the P2P list for others to message them
    if (user && !p2pContactsMap.has(user.id)) {
        const driverInfo = drivers.find(d => d.id === user.id);
        const selfUser = { ...user, status: driverInfo?.status || 'offline' } as AppUser & { status: Driver['status']};
        p2pContactsMap.set(user.id, {user: selfUser, unread: 0, hasStarred: false});
    }

    const sortFn = (a: ContactEntry, b: ContactEntry) => (b.lastMessage?.timestamp?.getTime() || 0) - (a.lastMessage?.timestamp?.getTime() || 0);
    
    const p2pContacts = Array.from(p2pContactsMap.values()).sort(sortFn);
    const dispatchLogContacts = Array.from(dispatchLogContactsMap.values()).sort(sortFn);
    
    const totalUnread = [...p2pContacts, ...dispatchLogContacts].reduce((sum, c) => sum + c.unread, 0);

    return { p2pContacts, dispatchLogContacts, totalUnread };
  }, [p2pMessages, dispatchChannelMessages, user, allUsers, drivers]);


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
    if (!db || !user) return;
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

    if (isNotificationToggleChecked) {
      let messageText = `New Ride Assignment\n\n`;
      messageText += `Pickup: ${rideToAssign.pickup.name}\n`;
      if (rideToAssign.dropoff) {
        messageText += `Dropoff: ${rideToAssign.dropoff.name}\n`;
      }
      if (rideToAssign.stops && rideToAssign.stops.length > 0) {
          messageText += `Stops: ${rideToAssign.stops.map(s => s.name).join(', ')}\n`;
      }
      messageText += `Passengers: ${rideToAssign.passengerCount || 1}\n`;
      if (rideToAssign.notes) {
        messageText += `Notes: ${rideToAssign.notes}\n`;
      }

      await handleSendMessage({
          threadId: getThreadIds(DISPATCHER_ID, shift.driverId),
          senderId: DISPATCHER_ID,
          recipientId: shift.driverId,
          text: messageText,
      });
    }
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

  const handleSendMessage = async (message: Omit<Message, 'id' | 'timestamp' | 'isReadBy'>) => {
    if (!db || !user) return;
    await addDoc(collection(db, 'messages'), {
        ...message,
        timestamp: serverTimestamp(),
        isReadBy: [user.uid],
    });
  };
  
 const handleMarkMessagesAsRead = async (participant: AppUser | Driver) => {
    if (!db || !user) return;
    
    const allDispatcherUsers = allUsers.filter(u => u.role & Role.DISPATCHER);
    const dispatcherUserIds = allDispatcherUsers.map(u => u.id);

    const isDispatchLog = !!(participant as any).context || participant.id === dispatcherUser.id || participant.name === "My Dispatch Log";
    let messagesToUpdateQuery;

    let otherUserId;
    if (isDispatchLog) {
      otherUserId = (participant as any).context?.id || user.uid;
    } else {
      otherUserId = participant.id;
    }
    
    const threadId = getThreadIds(otherUserId, isDispatchLog ? DISPATCHER_ID : user.uid);
    
    messagesToUpdateQuery = query(
        collection(db, 'messages'),
        where('threadId', '==', threadId)
    );

    const batch = writeBatch(db);
    const messagesSnapshot = await getDocs(messagesToUpdateQuery);
    
    messagesSnapshot.forEach(docSnapshot => {
        const message = docSnapshot.data() as Message;
        const readers = message.isReadBy || [];
        
        let shouldMarkAsRead = false;
        if (isDispatchLog) {
          // If it's a dispatch log, just add the current dispatcher's ID
          if (!readers.includes(user.uid)) {
            shouldMarkAsRead = true;
          }
        } else {
          // For P2P, only check if the current user has read it.
          if (!readers.includes(user.uid)) {
            shouldMarkAsRead = true;
          }
        }

        if (shouldMarkAsRead) {
            const newIsReadBy = [...readers, user.uid];
            batch.update(docSnapshot.ref, { isReadBy: newIsReadBy });
        }
    });

    if (messagesSnapshot.docs.length > 0) {
      await batch.commit();
    }
};

  
  const openChatWith = (contact: AppUser | Driver, isDispatchLog: boolean = false) => {
    const target = isDispatchLog 
        ? { ...dispatcherUser, context: contact, name: formatUserName((contact as AppUser).displayName, (contact as AppUser).email) } 
        : contact;

    setCurrentChatTarget(target as AppUser | Driver);
    handleMarkMessagesAsRead(target as AppUser | Driver);
    setIsChatDirectoryOpen(false);
  };
  
  const handleEndShift = async (shift: Shift) => {
    const result = await endShift(shift.id, shift.driverId, shift.vehicleId);
     if (result.type === 'success') {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }
  
  const getStatusIndicator = (status?: Driver['status']) => {
        switch(status) {
            case 'on-shift': return <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />;
            case 'available': return <div className="h-2.5 w-2.5 rounded-full bg-green-500" />;
            case 'offline': return <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />;
            default: return null;
        }
    }

  const handleNotificationToggle = async (checked: boolean) => {
    if (!user) return;
    setIsNotificationToggleChecked(checked); // Optimistic update
    const formData = new FormData();
    formData.append('userId', user.uid);
    formData.append('sendAssignmentNotifications', checked ? 'on' : 'off');
    const result = await updateUserProfile(null, formData);
    if (result.type === 'success') {
      toast({
        title: 'Setting Updated',
        description: `Automatic messages ${checked ? 'enabled' : 'disabled'}.`
      })
    } else {
      // Revert UI on failure
      setIsNotificationToggleChecked(!checked);
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: result.message,
      })
    }
  };


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
                    className="shrink-0 flex flex-col bg-muted/50 w-full lg:w-[320px]"
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
                          onToggleStar={toggleStarMessage}
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
                    "shrink-0 flex flex-col w-full lg:w-[320px]",
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
                              onToggleStar={toggleStarMessage}
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
                      "shrink-0 flex flex-col w-full lg:w-[320px]",
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
                                onToggleStar={toggleStarMessage}
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
          {activeShifts.map(shift => {
            const driverDispatchLog = chatDirectory.dispatchLogContacts.find(c => c.user.id === shift.driverId);
            const unreadCount = driverDispatchLog?.unread || 0;
            return (
                <DriverColumn
                  key={shift.id}
                  shift={shift}
                  rides={rides.filter(r => ['assigned', 'in-progress', 'completed'].includes(r.status) && r.shiftId === shift.id)}
                  allShifts={activeShifts}
                  allDrivers={drivers}
                  onAssignDriver={handleAssignDriver}
                  onChangeStatus={handleChangeStatus}
                  onSetFare={handleSetFare}
                  onUnassignDriver={handleUnassignDriver}
                  onEditRide={handleOpenEdit}
                  onUnscheduleRide={handleUnscheduleRide}
                  onToggleStar={toggleStarMessage}
                  onEndShift={handleEndShift}
                  onOpenChat={() => openChatWith(shift.driver as Driver, true)}
                  onEditShift={setEditingShift}
                  onEditVehicle={setEditingVehicle}
                  unreadCount={unreadCount}
                  className="w-full lg:w-[320px]"
                />
            )
           })}
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
            <TabsTrigger key={shift.id} value={shift.id}>{shift.driver.name.split(' ')[0]}</TabsTrigger>
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
                        onToggleStar={toggleStarMessage}
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
                          onToggleStar={toggleStarMessage}
                        />
                      ))}
                    </div>
                  </CarouselItem>
                )}


                {/* Driver Tabs */}
                {activeShifts.map(shift => {
                   const driverDispatchLog = chatDirectory.dispatchLogContacts.find(c => c.user.id === shift.driverId);
                   const unreadCount = driverDispatchLog?.unread || 0;
                  return (
                    <CarouselItem key={shift.id} className="overflow-y-auto">
                        <div className="pr-1">
                          <DriverColumn
                              shift={shift}
                              rides={rides.filter(r => ['assigned', 'in-progress', 'completed'].includes(r.status) && r.shiftId === shift.id)}
                              allShifts={activeShifts}
                              allDrivers={drivers}
                              onAssignDriver={handleAssignDriver}
                              onChangeStatus={handleChangeStatus}
                              onSetFare={handleSetFare}
                              onUnassignDriver={handleUnassignDriver}
                              onEditRide={handleOpenEdit}
                              onUnscheduleRide={handleUnscheduleRide}
                              onToggleStar={toggleStarMessage}
                              onEndShift={handleEndShift}
                              onOpenChat={() => openChatWith(shift.driver as Driver, true)}
                              onEditShift={setEditingShift}
                              onEditVehicle={setEditingVehicle}
                              unreadCount={unreadCount}
                            />
                        </div>
                    </CarouselItem>
                  )
                })}
              </CarouselContent>
            </Carousel>
        </div>
      </Tabs>
  )};

  const getMessageSnippet = (msg?: Message) => {
    if (!msg) return { snippet: 'No messages yet', sender: '' };
    const sender = allUsers.find(u => u.id === msg.senderId) || drivers.find(d => d.id === msg.senderId);
    const senderName = msg.senderId === user?.uid ? 'You' : formatUserName(sender?.name, (sender as AppUser)?.email);
    let snippet = '';
    if (msg.text) {
      snippet = msg.text.length > 30 ? `${msg.text.substring(0, 30)}...` : msg.text;
    } else if (msg.imageUrl) {
      snippet = 'Sent an image';
    } else if (msg.audioUrl) {
      snippet = 'Sent an audio message';
    }
    return { snippet, sender: `${senderName}: ` };
  }

  const handleBackFromChat = () => {
    setCurrentChatTarget(null);
    setIsChatDirectoryOpen(true);
  }

  return (
    <div className="h-full flex flex-col bg-secondary/50">
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
            <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => setIsShiftFormOpen(true)}>
                <Briefcase />
                Start Shift
            </Button>
            <Button variant="outline" size={isMobile ? 'sm' : 'default'} onClick={() => setIsBanCheckOpen(true)}>
                <ShieldCheck />
                Check Ban List
            </Button>
             <ResponsiveDialog 
                open={isShiftFormOpen} 
                onOpenChange={setIsShiftFormOpen}
                title="Start New Shift"
            >
                <StartShiftForm onFormSubmit={() => setIsShiftFormOpen(false)} />
            </ResponsiveDialog>
        </div>
        <div className="ml-auto items-center gap-4 hidden md:flex">
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

            <div className="flex items-center space-x-2">
                <Switch
                    id="assignment-notifications"
                    checked={isNotificationToggleChecked}
                    onCheckedChange={handleNotificationToggle}
                />
                <Label htmlFor="assignment-notifications" className="text-sm">Auto-Msg</Label>
            </div>
             
             <Button variant="outline" size="icon" onClick={zoomOut}>
              <ZoomOut />
            </Button>
            <span className="text-sm text-muted-foreground w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
            <Button variant="outline" size="icon" onClick={zoomIn}>
              <ZoomIn />
            </Button>
        </div>
      </div>

      <div className="flex flex-1 flex-row overflow-hidden p-2">
        {isMobile ? renderMobileView() : renderDesktopView()}
      </div>

      <div className="fixed bottom-6 right-24 z-50 flex flex-col items-center gap-3">
          <Button
            variant="secondary"
            size="icon"
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => setIsChatDirectoryOpen(true)}
          >
            <Mail className="h-7 w-7" />
            <span className="sr-only">My Messages</span>
             {chatDirectory.totalUnread > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-6 w-6 justify-center p-0">{chatDirectory.totalUnread}</Badge>
            )}
          </Button>
      </div>
      
      <VoiceControl
          rides={rides}
          drivers={drivers}
          onAddRide={handleAddRide}
          onAssignDriver={(rideId, driverId) => {
            const driver = drivers.find(d => d.id === driverId);
            if (driver && driver.currentShiftId) {
                handleAssignDriver(rideId, driver.currentShiftId);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Assignment Failed',
                    description: `Could not assign to ${formatUserName(driver?.name, (driver as AppUser)?.email)}. The driver is not on an active shift.`
                });
            }
          }}
          onChangeStatus={handleChangeStatus}
        />

        <ResponsiveDialog
            open={isChatDirectoryOpen}
            onOpenChange={setIsChatDirectoryOpen}
            title={
                <div className="flex items-center gap-2">
                    My Messages
                </div>
            }
        >
             <div className="p-4 space-y-1">
                 {chatDirectory.dispatchLogContacts.length > 0 && (
                     <>
                        <h4 className="text-sm font-semibold text-muted-foreground px-2">Dispatcher Logs</h4>
                        {chatDirectory.dispatchLogContacts.map(({ user: contact, unread, hasStarred, lastMessage }) => {
                            const { snippet, sender } = getMessageSnippet(lastMessage);
                            const displayName = contact.name === 'My Dispatch Log' 
                              ? contact.name 
                              : formatUserName(contact.name, (contact as AppUser).email);
                            return (
                                <Button 
                                    key={contact.id} 
                                    variant="ghost" 
                                    className="w-full justify-start h-auto py-2"
                                    onClick={() => openChatWith(contact, true)}
                                >
                                    <Avatar className="h-10 w-10 mr-4">
                                        <AvatarImage src={(contact as AppUser).photoURL ?? `https://i.pravatar.cc/40?u=${contact.id}`} />
                                        <AvatarFallback>{(displayName || 'U')[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold">{displayName}</p>
                                            {lastMessage?.timestamp && (
                                                <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(lastMessage.timestamp, { addSuffix: true })}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground truncate">{sender}{snippet}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end justify-center ml-2 gap-1">
                                        {unread > 0 && <Badge>{unread}</Badge>}
                                        {hasStarred && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                                    </div>
                                </Button>
                            );
                        })}
                     </>
                 )}

                {chatDirectory.p2pContacts.length > 0 && chatDirectory.dispatchLogContacts.length > 0 && <Separator className="my-4"/>}

                {chatDirectory.p2pContacts.filter(c => c.user.id !== user?.id).length > 0 && (
                    <>
                         <h4 className="text-sm font-semibold text-muted-foreground px-2">Private Chats</h4>
                        {chatDirectory.p2pContacts.filter(c => c.user.id !== user?.id).map(({ user: contact, unread, hasStarred, lastMessage }) => {
                            const { snippet, sender } = getMessageSnippet(lastMessage);
                             return (
                                <Button 
                                    key={contact.id} 
                                    variant="ghost" 
                                    className="w-full justify-start h-auto py-2"
                                    onClick={() => openChatWith(contact)}
                                >
                                    <Avatar className="h-10 w-10 mr-4">
                                        <AvatarImage src={(contact as AppUser).photoURL ?? `https://i.pravatar.cc/40?u=${contact.id}`} />
                                        <AvatarFallback>{(formatUserName(contact.name, (contact as AppUser).email) || 'U')[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 text-left">
                                        <div className="flex justify-between items-center">
                                            <p>{formatUserName(contact.name, (contact as AppUser).email)}</p>
                                             {lastMessage?.timestamp && (
                                                <span className="text-xs text-muted-foreground">{formatDistanceToNowStrict(lastMessage.timestamp, { addSuffix: true })}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {(contact as any).status && getStatusIndicator((contact as any).status)}
                                            <span className="text-xs text-muted-foreground truncate">{sender}{snippet}</span>
                                        </div>
                                    </div>
                                    {unread > 0 && <Badge className="ml-2">{unread}</Badge>}
                                </Button>
                            );
                        })}
                    </>
                )}
            </div>
        </ResponsiveDialog>
        
        {currentChatTarget && user && (
            <ResponsiveDialog
                open={!!currentChatTarget}
                onOpenChange={(isOpen) => !isOpen && setCurrentChatTarget(null)}
                title={
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={handleBackFromChat}>
                            <ArrowLeft />
                        </Button>
                        <span>
                            { (currentChatTarget as any).context || currentChatTarget.name === 'My Dispatch Log' ? 'Dispatcher Log:' : 'Chat with' }
                            &nbsp;
                            {
                                (currentChatTarget as any).context 
                                    ? formatUserName((currentChatTarget as any).context.name, (currentChatTarget as any).context.email)
                                    : currentChatTarget.name === 'My Dispatch Log' 
                                        ? '' 
                                        : formatUserName(currentChatTarget.name, (currentChatTarget as AppUser).email)
                            }
                        </span>
                    </div>
                }
            >
                <ChatView
                    participant={currentChatTarget}
                    messages={
                        (currentChatTarget as any).context
                        ? dispatchChannelMessages.filter(m => m.threadId.includes((currentChatTarget as any).context.id))
                        : p2pMessages.filter(m => m.threadId.includes(user.uid) && m.threadId.includes(currentChatTarget.id))
                    }
                    allDrivers={drivers}
                    onSendMessage={handleSendMessage}
                    onToggleStar={toggleStarMessage}
                    threadId={
                        (currentChatTarget as any).context
                        ? getThreadIds((currentChatTarget as any).context.id, DISPATCHER_ID)
                        : getThreadIds(user.uid, currentChatTarget.id)
                    }
                    onBack={handleBackFromChat}
                />
            </ResponsiveDialog>
        )}
        
        <ShiftNotesForm
            shift={editingShift}
            isOpen={!!editingShift}
            onOpenChange={(isOpen) => {
                if(!isOpen) setEditingShift(null);
            }}
        />

        <VehicleNotesForm
            vehicle={editingVehicle}
            isOpen={!!editingVehicle}
            onOpenChange={(isOpen) => {
                if(!isOpen) setEditingVehicle(null);
            }}
        />

        <EditShiftForm
            shift={editingShift}
            driver={drivers.find(d => d.id === editingShift?.driverId)}
            isOpen={!!editingShift}
            onOpenChange={(isOpen) => {
                if (!isOpen) setEditingShift(null);
            }}
        />

        <BanCheckDialog
            bans={bans}
            isOpen={isBanCheckOpen}
            onOpenChange={setIsBanCheckOpen}
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
