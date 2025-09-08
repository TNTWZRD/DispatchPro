"use client";

import { useState } from 'react';
import type { Ride } from '@/lib/types';
import { calculateFare, type FareCalculationOutput } from '@/ai/flows/fare-calculation';
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
import { Bot, Calendar, TrafficCone, Loader2, MessageSquare, DollarSign, TrendingUp, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from './ui/separator';

type FareEstimatorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  ride: Ride;
};

const getDistance = (ride: Ride) => {
    // Simple Euclidean distance for simulation
    const xDist = ride.pickup.coords.x - ride.dropoff.coords.x;
    const yDist = ride.pickup.coords.y - ride.dropoff.coords.y;
    const distance = Math.sqrt(xDist * xDist + yDist * yDist);
    // Scale to a more realistic mile value
    return Math.round((distance / 100) * 25);
}


export function FareEstimatorModal({ isOpen, onClose, ride }: FareEstimatorModalProps) {
  const [traffic, setTraffic] = useState('moderate');
  const [timeOfDay, setTimeOfDay] = useState('afternoon');
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<FareCalculationOutput | null>(null);
  const { toast } = useToast();

  const handlePredict = async () => {
    setIsLoading(true);
    setPrediction(null);

    try {
      const distance = getDistance(ride);
      const result = await calculateFare({
        distance,
        trafficConditions: traffic,
        timeOfDay: timeOfDay,
      });
      setPrediction(result);
    } catch (error) {
        toast({
            variant: "destructive",
            title: "Estimation Failed",
            description: "Could not get a fare estimate. Please try again.",
        });
      console.error('Fare estimation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetAndClose = () => {
    setPrediction(null);
    setIsLoading(false);
    onClose();
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ride Fare Estimator</DialogTitle>
          <DialogDescription>
            Estimate fare for ride #{ride.id.split('-').pop()} from {ride.pickup.name} to {ride.dropoff.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className='flex items-center text-sm text-muted-foreground'>
            <Info className='inline h-4 w-4 mr-2'/>
            Simulated distance for this ride is {getDistance(ride)} miles.
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
                <SelectItem value="peak hour">Peak Hour</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {isLoading && (
            <div className='flex items-center justify-center p-8'>
                <Loader2 className='h-8 w-8 animate-spin text-primary'/>
                <p className='ml-4'>Calculating Fare...</p>
            </div>
        )}

        {prediction && (
          <Alert>
            <Bot className="h-4 w-4" />
            <AlertTitle>Fare Estimate Result</AlertTitle>
            <AlertDescription className='space-y-3 mt-2'>
              <div className='flex items-center font-bold text-2xl'><DollarSign className='h-6 w-6 mr-1 text-primary'/> {formatCurrency(prediction.estimatedFare)}</div>
              
              <Separator />

              <div className='text-sm space-y-2 text-foreground'>
                <div className='font-medium'>Fare Breakdown</div>
                <div className='flex justify-between text-muted-foreground'><span>Base Fare:</span> <span>{formatCurrency(prediction.fareBreakdown.baseFare)}</span></div>
                <div className='flex justify-between text-muted-foreground'><span>Distance Charge:</span> <span>{formatCurrency(prediction.fareBreakdown.distanceCharge)}</span></div>
                <div className='flex justify-between text-muted-foreground'><span>Time/Traffic Charge:</span> <span>{formatCurrency(prediction.fareBreakdown.timeCharge)}</span></div>
                {prediction.fareBreakdown.surgeMultiplier > 1 && (
                    <div className='flex justify-between text-accent-foreground font-medium'><div className='flex items-center'><TrendingUp className='h-4 w-4 mr-1.5'/>Surge Multiplier:</div> <span>{prediction.fareBreakdown.surgeMultiplier}x</span></div>
                )}
              </div>
              
              <Separator />

              <div className='flex items-start'><MessageSquare className='h-4 w-4 mr-2 mt-1 flex-shrink-0 text-primary'/> <div><span className='font-medium'>Reasoning:</span> <span className='italic ml-1'>{prediction.reasoning}</span></div></div>
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button type="button" onClick={handlePredict} disabled={isLoading}>
            <Bot className="mr-2 h-4 w-4" />
            {isLoading ? 'Estimating...' : 'Estimate Fare'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
