

"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { Message, Driver, AppUser } from '@/lib/types';
import { Role, DISPATCHER_ID, dispatcherUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Mic, Send, StopCircle, Loader2, Forward, Trash2, MessageSquare, Star, ArrowLeft } from 'lucide-react';
import { cn, getThreadIds, formatUserName } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { processChatMessage } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { deleteMessage, forwardMessage, toggleStarMessage } from '@/app/actions';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ResponsiveDialog } from './responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';


type ChatViewProps = {
  participant: AppUser | Driver;
  messages: Message[];
  allDrivers: Driver[];
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isReadBy'>) => void;
  onToggleStar: typeof toggleStarMessage;
  threadId: string[];
  onBack?: () => void;
};

export function ChatView({ participant, messages, allDrivers, onSendMessage, onToggleStar, threadId, onBack }: ChatViewProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardRecipient, setForwardRecipient] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  
  const { user, allUsers, hasRole } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages]);


  const handleSendMessage = () => {
    if (text.trim() && user) {
      const recipientId = participant.id === DISPATCHER_ID ? DISPATCHER_ID : participant.id;
      onSendMessage({ 
        threadId: threadId,
        senderId: user.uid, 
        recipientId: recipientId,
        text 
      });
      setText('');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const recipientId = participant.id === DISPATCHER_ID ? DISPATCHER_ID : participant.id;
        onSendMessage({ 
            threadId: threadId,
            senderId: user.uid,
            recipientId: recipientId,
            imageUrl: reader.result as string 
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = async () => {
        if (!user) return;
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const audioDataUri = reader.result as string;
            try {
                const result = await processChatMessage({ audioDataUri });
                const recipientId = participant.id === DISPATCHER_ID ? DISPATCHER_ID : participant.id;
                onSendMessage({ 
                    threadId: threadId,
                    senderId: user.uid,
                    recipientId: recipientId,
                    text: result.responseText, 
                    audioUrl: audioDataUri 
                });
            } catch (error) {
                console.error("Audio processing failed", error);
                toast({ variant: 'destructive', title: "Audio processing failed" });
            } finally {
                setIsProcessing(false);
            }
        };
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (error) {
        toast({ variant: 'destructive', title: "Microphone access denied" });
        console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };
  
  const handleDeleteMessage = async (messageId: string) => {
    const result = await deleteMessage(messageId);
    if (result.type === 'success') {
      toast({ title: 'Message Deleted' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  const handleToggleStar = async (messageId: string, isStarred: boolean) => {
    const result = await onToggleStar(messageId, isStarred);
    if (result.type === 'success') {
      toast({ title: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  const handleForwardMessage = async () => {
    if (!forwardingMessage || !forwardRecipient || !user) return;
    
    const result = await forwardMessage(forwardingMessage, forwardRecipient, user.uid);
    if (result.type === 'success') {
      toast({ title: 'Message Forwarded' });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
    setForwardingMessage(null);
    setForwardRecipient('');
  }
  
  const canPerformActions = hasRole(Role.DISPATCHER) || hasRole(Role.ADMIN) || hasRole(Role.OWNER);

  const getSenderDetails = (senderId: string) => {
    if (senderId === DISPATCHER_ID) {
      return { 
          name: "Dispatch",
          avatar: (
            <Avatar className="h-8 w-8">
                <AvatarFallback><MessageSquare /></AvatarFallback>
            </Avatar>
          )
      };
    }
    
    if (senderId === user?.uid) {
        return {
            name: "Me",
            avatar: (
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL ?? undefined} />
                    <AvatarFallback>{(user?.displayName || 'U')[0]}</AvatarFallback>
                </Avatar>
            )
        }
    }

    const participantUser = allUsers.find(u => u.id === senderId);
    
    return {
        name: formatUserName(participantUser?.name, participantUser?.email),
        avatar: (
            <Avatar className="h-8 w-8">
                <AvatarImage src={participantUser?.photoURL ?? `https://i.pravatar.cc/40?u=${senderId}`} />
                <AvatarFallback>{(formatUserName(participantUser?.name, participantUser?.email) || 'U')[0]}</AvatarFallback>
            </Avatar>
        )
    };
  }

  return (
    <div className="flex flex-col h-[70vh]">
        {onBack && (
            <div className="absolute top-4 left-4 z-10 sm:hidden">
                <Button variant="ghost" size="icon" onClick={onBack}>
                    <ArrowLeft />
                </Button>
            </div>
        )}
      <ScrollArea className="flex-1" viewportRef={scrollViewportRef}>
        <div className="p-4 space-y-2">
          {messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const showNameplate = !previousMessage || previousMessage.senderId !== message.senderId;

            const senderDetails = getSenderDetails(message.senderId);
            const isOwnMessage = message.senderId === user?.uid;
            return (
                <ContextMenu key={message.id}>
                <ContextMenuTrigger disabled={!user}>
                    <div
                        className={cn('flex items-end gap-2 w-full', isOwnMessage ? 'justify-end' : 'justify-start')}
                    >
                    {!isOwnMessage && showNameplate && senderDetails.avatar}
                    {!isOwnMessage && !showNameplate && <div className="w-8" />}
                    <div className={cn("flex flex-col max-w-xs md:max-w-md", isOwnMessage ? "items-end" : "items-start")}>
                        {showNameplate && <p className={cn("text-xs text-muted-foreground mb-1", isOwnMessage ? "mr-2" : "ml-2")}>{senderDetails.name}</p>}
                        <div
                            className={cn(
                            'rounded-lg px-3 py-2 relative',
                            isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            )}
                        >
                            {message.isStarred && (
                            <Star className="h-3 w-3 absolute -top-1 -left-1 fill-yellow-400 text-yellow-500" />
                            )}
                            {message.text && <p className="text-sm break-words">{message.text}</p>}
                            {message.imageUrl && (
                            <Image src={message.imageUrl} alt="Uploaded content" width={200} height={200} className="rounded-md mt-2" />
                            )}
                            {message.audioUrl && (
                            <audio controls src={message.audioUrl} className="w-full mt-2" />
                            )}
                            {message.timestamp && isValid(new Date(message.timestamp)) && (
                            <p className="text-[10px] opacity-70 mt-1 text-right">{format(new Date(message.timestamp), 'p')}</p>
                            )}
                        </div>
                    </div>
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onSelect={() => setForwardingMessage(message)}>
                    <Forward className="mr-2 h-4 w-4" /> Forward
                    </ContextMenuItem>
                    {canPerformActions && threadId.includes(DISPATCHER_ID) && (
                    <ContextMenuItem onSelect={() => handleToggleStar(message.id, !!message.isStarred)}>
                        <Star className="mr-2 h-4 w-4" /> {message.isStarred ? 'Unstar' : 'Star'} Message
                    </ContextMenuItem>
                    )}
                    {canPerformActions && message.id && (
                        <ContextMenuItem className="text-destructive" onSelect={() => handleDeleteMessage(message.id)}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Message
                        </ContextMenuItem>
                    )}
                </ContextMenuContent>
                </ContextMenu>
            )
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="flex-1"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            className="hidden"
            accept="image/*"
          />
          <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
            <Paperclip />
          </Button>
          {isRecording ? (
            <Button variant="destructive" size="icon" onClick={stopRecording}>
              <StopCircle />
            </Button>
          ) : (
            <Button variant="ghost" size="icon" onClick={startRecording} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="animate-spin" /> : <Mic />}
            </Button>
          )}
          <Button size="icon" onClick={handleSendMessage} disabled={!text.trim()}>
            <Send />
          </Button>
        </div>
      </div>
      
      <ResponsiveDialog
        open={!!forwardingMessage}
        onOpenChange={(isOpen) => !isOpen && setForwardingMessage(null)}
        title="Forward Message"
       >
         <div className="space-y-4 py-4">
             <div className="space-y-2">
                <Label>Forward to:</Label>
                 <Select value={forwardRecipient} onValueChange={setForwardRecipient}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select a recipient..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={DISPATCHER_ID}>Dispatch Log</SelectItem>
                        {allDrivers.filter(d => d.id !== user?.uid).map(driver => (
                            <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
            </div>
            <Button onClick={handleForwardMessage} disabled={!forwardRecipient} className="w-full">
                <Send className="mr-2"/> Forward
            </Button>
         </div>
       </ResponsiveDialog>
    </div>
  );
}
