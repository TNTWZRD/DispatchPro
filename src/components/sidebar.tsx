
"use client";

import { useState, useMemo } from 'react';
import { MapView } from './map-view';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import type { Ride, Driver, Message, AppUser } from '@/lib/types';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn, formatUserName, getThreadId } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from './ui/scroll-area';
import { ResponsiveDialog } from './responsive-dialog';
import { ChatView } from './chat-view';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/context/auth-context';
import { Badge } from '@/components/ui/badge';
import { DISPATCHER_ID } from '@/lib/types';


type ChatListProps = {
    allUsers: AppUser[];
    allDrivers: Driver[];
    messages: Message[];
    onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => void;
    onMarkMessagesAsRead: (contactId: string) => void;
}

function ChatList({ allUsers, allDrivers, messages, onSendMessage, onMarkMessagesAsRead }: ChatListProps) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const { user } = useAuth();
    
    const contacts = useMemo(() => {
        const combined = new Map<string, { id: string; name: string; photoURL?: string | null; status?: Driver['status'] }>();
        
        allUsers.forEach(u => {
            if (u.id === user?.id) return; // Don't list self
            const driverInfo = allDrivers.find(d => d.id === u.id);
            combined.set(u.id, {
                id: u.id,
                name: u.displayName || u.email || 'Unknown User',
                photoURL: u.photoURL,
                status: driverInfo?.status || 'offline'
            });
        });

        allDrivers.forEach(d => {
            if (d.id === user?.id) return;
            if (!combined.has(d.id)) {
                 combined.set(d.id, {
                    id: d.id,
                    name: d.name,
                    status: d.status
                 });
            }
        });
        
        return Array.from(combined.values()).sort((a,b) => a.name.localeCompare(b.name));
    }, [allUsers, allDrivers, user]);

    const getUnreadCount = (contactId: string) => {
        if (!user) return 0;
        const threadId = getThreadId(user.uid, contactId);
        return messages.filter(m => getThreadId(m.senderId, m.recipientId) === threadId && m.recipientId === user.uid && !m.isRead).length;
    };
    
    const openChat = (contactId: string) => {
        setCurrentThreadId(contactId);
        onMarkMessagesAsRead(contactId);
    };

    const currentParticipant = useMemo(() => {
       const contact = contacts.find(c => c.id === currentThreadId);
       if (!contact) return null;
       // We need to return an object that matches AppUser or Driver shape for ChatView
       return {
            id: contact.id,
            uid: contact.id,
            name: contact.name,
            displayName: contact.name,
            photoURL: contact.photoURL,
            email: ''
       } as AppUser
    }, [contacts, currentThreadId]);

    const getStatusIndicator = (status?: Driver['status']) => {
        switch(status) {
            case 'on-shift': return <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />;
            case 'available': return <div className="h-2.5 w-2.5 rounded-full bg-green-500" />;
            case 'offline': return <div className="h-2.5 w-2.5 rounded-full bg-gray-400" />;
            default: return null;
        }
    }


    return (
        <div className="flex flex-col gap-2">
            <h3 className="font-semibold px-2">Direct Messages</h3>
            <ScrollArea className="h-[250px]">
                 <div className="space-y-1 pr-2">
                    {contacts.map(contact => {
                        const unreadCount = getUnreadCount(contact.id);
                        return (
                            <Button 
                                key={contact.id} 
                                variant="ghost" 
                                className="w-full justify-start h-12"
                                onClick={() => openChat(contact.id)}
                            >
                                <Avatar className="h-8 w-8 mr-3">
                                    <AvatarImage src={contact.photoURL ?? `https://i.pravatar.cc/40?u=${contact.id}`} />
                                    <AvatarFallback>{contact.name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                    <p>{formatUserName(contact.name)}</p>
                                    <div className="flex items-center gap-2">
                                        {getStatusIndicator(contact.status)}
                                        <span className="text-xs text-muted-foreground capitalize">{contact.status?.replace('-', ' ')}</span>
                                    </div>
                                </div>
                                {unreadCount > 0 && <Badge className="h-5">{unreadCount}</Badge>}
                            </Button>
                        )
                    })}
                 </div>
            </ScrollArea>
             {currentParticipant && user && (
                <ResponsiveDialog
                    open={!!currentThreadId}
                    onOpenChange={(isOpen) => !isOpen && setCurrentThreadId(null)}
                    title={`Chat with ${formatUserName(currentParticipant.name || '')}`}
                >
                    <ChatView
                        participant={currentParticipant}
                        messages={messages.filter(m => getThreadId(m.senderId, m.recipientId) === getThreadId(user.uid, currentParticipant.id))}
                        allDrivers={allDrivers}
                        onSendMessage={onSendMessage}
                    />
                </ResponsiveDialog>
            )}
        </div>
    );
}


type SidebarProps = {
  rides: Ride[];
  drivers: Driver[];
  allUsers: AppUser[];
  messages: Message[];
  onAssignSuggestion: (rideId: string, driverId: string) => void;
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => void;
  onMarkMessagesAsRead: (contactId: string) => void;
};

export function Sidebar({ rides, drivers, allUsers, messages, onAssignSuggestion, onSendMessage, onMarkMessagesAsRead }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const isMobile = useIsMobile();
  const { user } = useAuth();
  
  if (isMobile || !user) return null;

  const onShiftDrivers = drivers.filter(d => d.status === 'on-shift');
  
  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="hidden lg:flex flex-col gap-4 transition-all"
    >
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="icon" className={cn(!isOpen && 'hidden')}>
            <PanelLeftClose />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent asChild className="data-[state=closed]:hidden">
        <div className="w-[350px] xl:w-[450px] flex flex-col gap-4">
            <MapView rides={rides} drivers={drivers} />
            <ChatList 
                allUsers={allUsers}
                allDrivers={drivers}
                messages={messages} 
                onSendMessage={onSendMessage} 
                onMarkMessagesAsRead={onMarkMessagesAsRead} 
            />
        </div>
      </CollapsibleContent>
       {!isOpen && (
         <Button variant="ghost" size="icon" onClick={() => setIsOpen(true)}>
            <PanelLeftOpen />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
      )}
    </Collapsible>
  );
}
