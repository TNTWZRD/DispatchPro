"use client";

import { useState, useRef, useEffect } from 'react';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { parseVoiceCommand, type VoiceCommandOutput } from '@/ai/flows/parse-voice-command';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Command, StopCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

type VoiceCommanderProps = {
  rides: Ride[];
  drivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
};

export function VoiceCommander({ rides, drivers, onAssignDriver, onChangeStatus }: VoiceCommanderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        handleProcessCommand(currentTranscript);
      };

      recognitionRef.current.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        toast({
            variant: "destructive",
            title: "Voice Error",
            description: `Could not recognize command: ${event.error}`,
        });
        setIsRecording(false);
      };

    } else {
        setMicAvailable(false);
    }

     if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const hasMic = devices.some(device => device.kind === 'audioinput');
          if(!hasMic) setMicAvailable(false);
        })
        .catch(() => setMicAvailable(false));
    } else {
      setMicAvailable(false);
    }
  }, [toast]);

  const handleToggleRecording = () => {
    if (!micAvailable || !recognitionRef.current) {
      toast({
        variant: 'destructive',
        title: 'Microphone not available',
        description: 'Could not find a microphone. Please connect one and grant permission.',
      });
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const handleProcessCommand = async (command: string) => {
    if (!command) return;

    setIsProcessing(true);
    try {
      const result: VoiceCommandOutput = await parseVoiceCommand({
        command: command,
        rides: rides.map(r => ({id: r.id, status: r.status})),
        drivers: drivers.map(d => ({id: d.id, name: d.name})),
      });

      handleExecuteCommand(result);

    } catch (error) {
      console.error('Error processing command:', error);
      toast({
        variant: 'destructive',
        title: 'Command Failed',
        description: 'Could not process the voice command.',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleExecuteCommand = (command: VoiceCommandOutput) => {
    switch (command.action) {
        case 'assign':
            if (command.rideId && command.driverId) {
                onAssignDriver(command.rideId, command.driverId);
                 toast({
                    title: "Action Executed: Assign",
                    description: command.reasoning,
                });
            }
            break;
        case 'updateStatus':
            if (command.rideId && command.newStatus) {
                onChangeStatus(command.rideId, command.newStatus);
                 toast({
                    title: `Action Executed: Status to ${command.newStatus}`,
                    description: command.reasoning,
                });
            }
            break;
        case 'cancel':
        case 'delete':
             if (command.rideId) {
                onChangeStatus(command.rideId, 'cancelled');
                 toast({
                    title: "Action Executed: Cancel Ride",
                    description: command.reasoning,
                });
            }
            break;
        default:
             toast({
                variant: "destructive",
                title: "Command Unclear",
                description: command.reasoning || "Could not understand the command. Please try again.",
            });
            break;
    }
  }


  const buttonText = isRecording ? 'Listening...' : 'Give a Command';
  const ButtonIcon = isRecording ? StopCircle : Command;

  if (!isClient) {
    return null; // Don't render on the server
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Voice Commander</CardTitle>
        <CardDescription>Use your voice to manage rides.</CardDescription>
      </CardHeader>
      <CardContent>
        {!micAvailable ? (
          <div className="flex items-center justify-center p-4 bg-destructive/10 text-destructive rounded-md">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <p className="text-sm font-medium">No microphone or speech recognition API not available.</p>
          </div>
        ) : (
          <Button
            onClick={handleToggleRecording}
            disabled={isProcessing}
            className={cn("w-full", isRecording && "bg-amber-600 hover:bg-amber-700")}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ButtonIcon className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? 'Processing...' : buttonText}
          </Button>
        )}
        {transcript && (
            <Alert className="mt-4">
                <Command className="h-4 w-4" />
                <AlertTitle>Heard you say:</AlertTitle>
                <AlertDescription className="italic">
                    "{transcript}"
                </AlertDescription>
            </Alert>
        )}
      </CardContent>
    </Card>
  );
}
