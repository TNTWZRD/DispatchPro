"use client";

import { useState, useRef, useEffect } from 'react';
import type { Ride } from '@/lib/types';
import { logCallFromAudio, type LogCallFromAudioOutput } from '@/ai/flows/log-call-from-audio';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, StopCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type VoiceRecorderProps = {
  onAddRide: (rideData: Omit<Ride, 'id' | 'status' | 'driverId' | 'requestTime' | 'isNew'>) => void;
};

export function VoiceRecorder({ onAddRide }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [micAvailable, setMicAvailable] = useState(true);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    setIsClient(true);
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
          const hasMic = devices.some(device => device.kind === 'audioinput');
          setMicAvailable(hasMic);
        })
        .catch(() => setMicAvailable(false));
    } else {
      setMicAvailable(false);
    }
  }, []);

  const handleStartRecording = async () => {
    if (!micAvailable) {
      toast({
        variant: 'destructive',
        title: 'Microphone not available',
        description: 'Could not find a microphone. Please connect one and grant permission.',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.addEventListener('dataavailable', event => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorderRef.current.addEventListener('stop', handleStop);
      mediaRecorderRef.current.start();
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
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleStop = async () => {
    setIsRecording(false);
    setIsProcessing(true);

    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result as string;
      try {
        const result: LogCallFromAudioOutput = await logCallFromAudio({
          audioDataUri: base64Audio,
        });
        
        onAddRide({
          passengerPhone: result.passengerPhone,
          pickup: { name: result.pickupLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
          dropoff: { name: result.dropoffLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
          passengerCount: result.passengerCount,
          movingFee: result.movingFee,
          scheduledTime: result.scheduledTime ? new Date(result.scheduledTime) : undefined,
        });

        toast({
          title: 'Call Logged Successfully',
          description: `New ride for ${result.passengerPhone} has been added to the waiting list.`,
        });

      } catch (error) {
        console.error('Error processing audio:', error);
        toast({
          variant: 'destructive',
          title: 'Processing Failed',
          description: 'Could not extract ride details from the recording. Please try again.',
        });
      } finally {
        setIsProcessing(false);
      }
    };
  };

  const buttonText = isRecording ? 'Stop Recording' : 'Record a Call';
  const ButtonIcon = isRecording ? StopCircle : Mic;

  if (!isClient) {
    return null; // Don't render on the server
  }

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>Voice Call Logger</CardTitle>
        <CardDescription>Record a call to automatically create a ride request.</CardDescription>
      </CardHeader>
      <CardContent>
        {!micAvailable ? (
          <div className="flex items-center justify-center p-4 bg-destructive/10 text-destructive rounded-md">
            <AlertTriangle className="mr-2 h-5 w-5" />
            <p className="text-sm font-medium">No microphone detected.</p>
          </div>
        ) : (
          <Button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
            className={cn("w-full", isRecording && "bg-red-600 hover:bg-red-700")}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ButtonIcon className="mr-2 h-4 w-4" />
            )}
            {isProcessing ? 'Processing...' : buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
