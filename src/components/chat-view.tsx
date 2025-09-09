
"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import type { Message } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Paperclip, Mic, Send, StopCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { processChatMessage } from '@/ai/flows/chat-flow';
import { useToast } from '@/hooks/use-toast';

type ChatViewProps = {
  driverId: string;
  driverName: string;
  messages: Message[];
  onSendMessage: (message: Omit<Message, 'id' | 'timestamp' | 'isRead'>) => void;
  sender: 'driver' | 'dispatcher';
};

export function ChatView({ driverId, driverName, messages, onSendMessage, sender }: ChatViewProps) {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  const handleSendMessage = () => {
    if (text.trim()) {
      onSendMessage({ driverId, sender, text });
      setText('');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSendMessage({ driverId, sender, imageUrl: reader.result as string });
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
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const audioDataUri = reader.result as string;
            try {
                const result = await processChatMessage({ audioDataUri });
                onSendMessage({ driverId, sender, text: result.responseText, audioUrl: audioDataUri });
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
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        const scrollContainer = scrollAreaRef.current.querySelector('div');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[70vh]">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn('flex items-end gap-2', message.sender === sender ? 'justify-end' : 'justify-start')}
            >
              {message.sender !== sender && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={message.sender === 'driver' ? `https://i.pravatar.cc/40?u=${driverId}` : undefined} />
                  <AvatarFallback>{message.sender === 'driver' ? driverName[0] : 'D'}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={cn(
                  'max-w-xs md:max-w-md rounded-lg px-3 py-2',
                  message.sender === sender ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}
              >
                {message.text && <p className="text-sm">{message.text}</p>}
                {message.imageUrl && (
                  <Image src={message.imageUrl} alt="Uploaded content" width={200} height={200} className="rounded-md mt-2" />
                )}
                {message.audioUrl && (
                  <audio controls src={message.audioUrl} className="w-full mt-2" />
                )}
                <p className="text-xs opacity-70 mt-1 text-right">{format(message.timestamp, 'p')}</p>
              </div>
            </div>
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
    </div>
  );
}
