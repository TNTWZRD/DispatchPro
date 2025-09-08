"use client";

import { useState } from 'react';
import type { Ride, Driver } from '@/lib/types';
import { predictDriverEta } from '@/ai/flows/driver-eta-prediction';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, Clock, Calendar, TrafficCone, Loader2, Star, Percent, MessageSquare } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type EtaPredictorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ride: Ride;
  drivers: Driver[];
};

type PredictionResult = {
  estimatedTimeOfArrival: string;
  confidenceLevel: string;
  reasoning: string;
};

export function EtaPredictorModal({ isOpen, onClose, ride, drivers }: EtaPredictorModalProps) {
  const [traffic, setTraffic] = useState('moderate');
  const [timeOfDay, setTimeOfDay] = useState('afternoon');
  const [driverId, setDriverId] = useState<string | null>(ride.driverId);
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const { toast } = useToast();

  const handlePredict = async () => {
    if (!driverId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a driver.",
      });
      return;
    }
    
    const driver = drivers.find(d => d.id === driverId);
    if (!driver) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Selected driver not found.",
        });
        return;
    }

    setIsLoading(true);
    setPrediction(null);

    try {
      const result = await predictDriverEta({
        pickupLocation: ride.pickup.name,
        dropoffLocation: ride.dropoff.name,
        driverLocation: 'Simulated Location', // In a real app, this would be live data
        trafficConditions: traffic,
        timeOfDay: timeOfDay,
      });
      setPrediction(result);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Prediction Failed",
            description: "Could not get an ETA prediction. Please try again.",
        });
      console.error('Prediction failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetAndClose = () => {
    setPrediction(null);
    setIsLoading(false);
    setDriverId(ride.driverId);
    onClose();
  }

  const availableDrivers = drivers.filter(d => d.status === 'available' || d.id === ride.driverId);

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Driver ETA Prediction</DialogTitle>
          <DialogDescription>
            Estimate arrival time for ride #{ride.id.split('-').pop()}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="driver" className="text-right">Driver</Label>
            <Select onValueChange={setDriverId} defaultValue={driverId || undefined}>
               <SelectTrigger id="driver" className="col-span-3">
                <SelectValue placeholder="Select a driver" />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="traffic" className="text-right"><TrafficCone className='inline h-4 w-4 mr-1'/>Traffic</Label>
             <Select onValueChange={setTraffic} defaultValue={traffic}>
               <SelectTrigger id="traffic" className="col-span-3">
                <SelectValue placeholder="Select traffic conditions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="heavy">Heavy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="time-of-day" className="text-right"><Calendar className='inline h-4 w-4 mr-1'/>Time</Label>
             <Select onValueChange={setTimeOfDay} defaultValue={timeOfDay}>
               <SelectTrigger id="time-of-day" className="col-span-3">
                <SelectValue placeholder="Select time of day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading && (
            <div className='flex items-center justify-center p-8'>
                <Loader2 className='h-8 w-8 animate-spin text-primary'/>
                <p className='ml-4'>Calculating ETA...</p>
            </div>
        )}

        {prediction && (
          <Alert>
            <Bot className="h-4 w-4" />
            <AlertTitle>Prediction Result</AlertTitle>
            <AlertDescription className='space-y-2 mt-2'>
              <div className='flex items-center font-bold text-lg'><Clock className='h-5 w-5 mr-2 text-primary'/> ETA: {prediction.estimatedTimeOfArrival}</div>
              <div className='flex items-center'><Percent className='h-4 w-4 mr-2 text-primary'/> Confidence: {prediction.confidenceLevel}</div>
              <div className='flex items-start'><MessageSquare className='h-4 w-4 mr-2 mt-1 text-primary'/> Reasoning: <span className='italic ml-1'>{prediction.reasoning}</span></div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" onClick={handlePredict} disabled={isLoading}>
            <Bot className="mr-2 h-4 w-4" />
            {isLoading ? 'Predicting...' : 'Predict ETA'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
