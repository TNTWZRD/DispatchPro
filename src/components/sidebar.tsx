
"use client";

import { useState } from 'react';
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


type ChatListProps = {
    drivers: Driver[];
    messages: Message[];
    allDrivers: Driver[]; // For forwarding
    onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => void;
    onMarkMessagesAsRead: (driverId: string) => void;
}

function ChatList({ drivers, messages, allDrivers, onSendMessage, onMarkMessagesAsRead }: ChatListProps) {
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const { user } = useAuth();

    const getUnreadCount = (driverId: string) => {
        if (!user) return 0;
        const threadId = getThreadId(user.uid, driverId);
        return messages.filter(m => m.threadId === threadId && m.recipientId === user.uid && !m.isRead).length;
    };
    
    const openChat = (driverId: string) => {
        setCurrentThreadId(driverId);
        onMarkMessagesAsRead(driverId);
    };

    const currentParticipant = drivers.find(d => d.id === currentThreadId);

    return (
        <div className="flex flex-col gap-2">
            <h3 className="font-semibold px-2">P2P Chats</h3>
            <ScrollArea className="h-[200px]">
                 <div className="space-y-1 pr-2">
                    {drivers.map(driver => {
                        const unreadCount = getUnreadCount(driver.id);
                        return (
                            <Button 
                                key={driver.id} 
                                variant="ghost" 
                                className="w-full justify-start h-12"
                                onClick={() => openChat(driver.id)}
                            >
                                <Avatar className="h-8 w-8 mr-3">
                                    <AvatarImage src={`https://i.pravatar.cc/40?u=${driver.id}`} />
                                    <AvatarFallback>{driver.name?.[0] || 'D'}</AvatarFallback>
                                </Avatar>
                                <span className="flex-1 text-left">{formatUserName(driver.name)}</span>
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
                    title={`Chat with ${formatUserName(currentParticipant.name)}`}
                >
                    <ChatView
                        threadId={getThreadId(user.uid, currentParticipant.id)}
                        participant={currentParticipant}
                        messages={messages.filter(m => m.threadId === getThreadId(user.uid, currentParticipant.id))}
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
  messages: Message[];
  onAssignSuggestion: (rideId: string, driverId: string) => void;
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => void;
  onMarkMessagesAsRead: (driverId: string) => void;
};

export function Sidebar({ rides, drivers, messages, onAssignSuggestion, onSendMessage, onMarkMessagesAsRead }: SidebarProps) {
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
                drivers={onShiftDrivers}
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
