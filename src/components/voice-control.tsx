
"use client";

import { useState, useRef, useEffect } from 'react';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { processVoiceInput, type VoiceOutput } from '@/ai/flows/unified-voice-flow';
import { Button } from '@/components/ui/button';
import { Mic, StopCircle, Loader2, AlertTriangle, Command, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';

type VoiceControlProps = {
  rides: Ride[];
  drivers: Driver[];
  onAddRide: (rideData: Omit<Ride, 'id' | 'status' | 'driverId' | 'requestTime' | 'isNew'>) => void;
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
};

export function VoiceControl({ rides, drivers, onAddRide, onAssignDriver, onChangeStatus }: VoiceControlProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    const setupMic = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          throw new Error("Media devices not supported");
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasMic = devices.some(device => device.kind === 'audioinput');
        if (!hasMic) {
            throw new Error("No microphone found");
        }
        setMicAvailable(true);
      } catch (error) {
        setMicAvailable(false);
        console.error("Mic setup failed:", error);
      }
    };

    setupMic();

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
             // Final transcript is handled by the media recorder flow
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(interimTranscript);
      };

      recognitionRef.current.onend = () => {
        // This is triggered when speech recognition stops
      };
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        toast({
            variant: "destructive",
            title: "Voice Error",
            description: `Could not recognize speech: ${event.error}`,
        });
        if (isRecording) {
            handleStopRecording();
        }
      };
    } else {
        setMicAvailable(false);
    }
  }, [toast, isRecording]);

  const handleStartRecording = async () => {
    if (!micAvailable) {
      toast({
        variant: 'destructive',
        title: 'Microphone not available',
        description: 'Could not find a microphone. Please connect one and grant permission.',
      });
      return;
    }
    setTranscript('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.addEventListener('dataavailable', event => {
        audioChunksRef.current.push(event.data);
      });
      mediaRecorderRef.current.addEventListener('stop', handleProcessAudio);
      mediaRecorderRef.current.start();
      recognitionRef.current?.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      toast({
        variant: 'destructive',
        title: 'Microphone Access Denied',
        description: 'Please grant permission to use the microphone.',
      });
      setMicAvailable(false);
    }
  };

  const handleStopRecording = () => {
    mediaRecorderRef.current?.stop();
    recognitionRef.current?.stop();
    setIsRecording(false);
    // Processing will be triggered by the 'stop' event listener
  };

  const handleProcessAudio = async () => {
    setIsProcessing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const result: VoiceOutput = await processVoiceInput({
          audioDataUri: base64Audio,
          rides: rides.map(r => ({id: r.id, status: r.status})),
          drivers: drivers.map(d => ({id: d.id, name: d.name})),
        });
        handleExecuteResult(result);
      } catch (error) {
        console.error('Error processing audio:', error);
        toast({
          variant: 'destructive',
          title: 'Processing Failed',
          description: 'Could not understand the recording. Please try again.',
        });
      } finally {
        setIsProcessing(false);
        setTranscript('');
        setIsOpen(false);
      }
    };
  };

  const handleExecuteResult = (result: VoiceOutput) => {
    toast({
        title: `Action: ${result.intent.charAt(0).toUpperCase() + result.intent.slice(1)}`,
        description: result.reasoning,
    });
    
    if (result.intent === 'create') {
        onAddRide({
          passengerPhone: result.passengerPhone,
          pickup: { name: result.pickupLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
          dropoff: { name: result.dropoffLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
          passengerCount: result.passengerCount,
          movingFee: result.movingFee,
          scheduledTime: result.scheduledTime ? new Date(result.scheduledTime) : undefined,
        });
    } else if (result.intent === 'manage') {
        switch (result.action) {
            case 'assign':
                if (result.rideId && result.driverId) {
                    onAssignDriver(result.rideId, result.driverId);
                }
                break;
            case 'updateStatus':
                if (result.rideId && result.newStatus) {
                    onChangeStatus(result.rideId, result.newStatus);
                }
                break;
            case 'cancel':
            case 'delete':
                 if (result.rideId) {
                    onChangeStatus(result.rideId, 'cancelled');
                }
                break;
            default:
                 toast({
                    variant: "destructive",
                    title: "Command Unclear",
                    description: result.reasoning || "Could not understand the command. Please try again.",
                });
                break;
        }
    } else { // unknown intent
        toast({
            variant: "destructive",
            title: "Could not determine intent",
            description: result.reasoning,
        });
    }
  }

  const buttonText = isRecording ? 'Listening... (Click to Stop)' : 'Record Voice Command';
  const ButtonIcon = isRecording ? StopCircle : Mic;

  if (!isClient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="default"
          size="icon"
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-50"
          disabled={!micAvailable}
        >
          <Mic className="h-8 w-8" />
          <span className="sr-only">Voice Command</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unified Voice Control</DialogTitle>
        </DialogHeader>
        {!micAvailable ? (
          <div className="flex items-center justify-center p-4 bg-destructive/10 text-destructive rounded-md">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <p className="text-sm font-medium">Voice control not available on this device.</p>
          </div>
        ) : (
          <div className="py-4">
            <Button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              disabled={isProcessing}
              className={cn("w-full h-24 text-lg", isRecording && "bg-red-600 hover:bg-red-700")}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              ) : (
                <ButtonIcon className="mr-2 h-6 w-6" />
              )}
              {isProcessing ? 'Processing...' : buttonText}
            </Button>
          </div>
        )}
        {transcript && (
            <Alert className="mt-4">
                <Command className="h-4 w-4" />
                <AlertTitle>Transcript:</AlertTitle>
                <AlertDescription className="italic">
                    "{transcript}"
                </AlertDescription>
            </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
