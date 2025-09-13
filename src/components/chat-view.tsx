
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { Message, Driver, AppUser } from '@/lib/types';
import { Role, DISPATCHER_ID, dispatcherUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Mic, Send, StopCircle, Loader2, Forward, Trash2, CornerUpLeft, MessageSquare } from 'lucide-react';
import { cn, formatUserName, getThreadId } from '@/lib/utils';
import { format, isValid } from 'date-fns';
import { processChatMessage } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/auth-context';
import { deleteMessage, forwardMessage } from '@/app/actions';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ResponsiveDialog } from './responsive-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';


type ChatViewProps = {
  threadId: string;
  participant: Driver | AppUser;
  messages: Message[];
  allDrivers: Driver[];
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => void;
};

export function ChatView({ threadId, participant, messages, allDrivers, onSendMessage }: ChatViewProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardRecipient, setForwardRecipient] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement>(null);
  
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  
  const senderType = hasRole(Role.DRIVER) ? 'driver' : 'dispatcher';

  useEffect(() => {
    if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollViewportRef.current.scrollHeight;
    }
  }, [messages]);


  const handleSendMessage = () => {
    if (text.trim() && user) {
      onSendMessage({ 
        threadId: threadId,
        sender: senderType,
        senderId: user.uid, 
        recipientId: participant.id,
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
        onSendMessage({ 
            threadId: threadId,
            sender: senderType,
            senderId: user.uid,
            recipientId: participant.id,
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
                onSendMessage({ 
                    threadId: threadId,
                    sender: senderType,
                    senderId: user.uid,
                    recipientId: participant.id,
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
  
  const canDelete = hasRole(Role.DISPATCHER) || hasRole(Role.ADMIN) || hasRole(Role.OWNER);

  const getParticipantAvatar = () => {
    if (participant.id === DISPATCHER_ID) {
      return (
        <Avatar className="h-8 w-8">
            <AvatarFallback><MessageSquare /></AvatarFallback>
        </Avatar>
      );
    }
    return (
        <Avatar className="h-8 w-8">
            <AvatarImage src={(participant as AppUser).photoURL ?? `https://i.pravatar.cc/40?u=${participant.id}`} />
            <AvatarFallback>{(participant.name || (participant as AppUser).displayName)?.[0] || 'U'}</AvatarFallback>
        </Avatar>
    );
  }

  return (
    <div className="flex flex-col h-[70vh]">
      <ScrollArea className="flex-1" viewportRef={scrollViewportRef}>
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <ContextMenu key={message.id}>
              <ContextMenuTrigger disabled={!user}>
                <div
                  className={cn('flex items-end gap-2', message.senderId === user?.uid ? 'justify-end' : 'justify-start')}
                >
                  {message.senderId !== user?.uid && getParticipantAvatar()}
                  <div
                    className={cn(
                      'max-w-xs md:max-w-md rounded-lg px-3 py-2',
                      message.senderId === user?.uid ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    {message.forwardedFrom && (
                       <div className="text-xs opacity-80 flex items-center gap-1 mb-1">
                           <CornerUpLeft className="h-3 w-3" /> 
                           Forwarded
                        </div>
                    )}
                    {message.text && <p className="text-sm break-words">{message.text}</p>}
                    {message.imageUrl && (
                      <Image src={message.imageUrl} alt="Uploaded content" width={200} height={200} className="rounded-md mt-2" />
                    )}
                    {message.audioUrl && (
                      <audio controls src={message.audioUrl} className="w-full mt-2" />
                    )}
                    {message.timestamp && isValid(new Date(message.timestamp)) && (
                      <p className="text-xs opacity-70 mt-1 text-right">{format(new Date(message.timestamp), 'p')}</p>
                    )}
                  </div>
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent>
                <ContextMenuItem onSelect={() => setForwardingMessage(message)}>
                  <Forward className="mr-2 h-4 w-4" /> Forward
                </ContextMenuItem>
                 {canDelete && message.audioUrl && (
                    <ContextMenuItem className="text-destructive" onSelect={() => handleDeleteMessage(message.id)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete Voice Message
                    </ContextMenuItem>
                 )}
              </ContextMenuContent>
            </ContextMenu>
          ))}
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
                        <SelectValue placeholder="Select a driver..." />
                    </SelectTrigger>
                    <SelectContent>
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
