"use client";

import { useState } from 'react';
import type { Ride, Driver } from '@/lib/types';
import { getDispatchingSuggestions, type DispatchingSuggestionsOutput } from '@/ai/flows/dispatching-suggestions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lightbulb, Loader2, Truck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type DispatchSuggesterProps = {
  pendingRides: Ride[];
  availableDrivers: Driver[];
  onAssignSuggestion: (rideId: string, driverId: string) => void;
};

export function DispatchSuggester({ pendingRides, availableDrivers, onAssignSuggestion }: DispatchSuggesterProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<DispatchingSuggestionsOutput | null>(null);
  const { toast } = useToast();

  const handleGetSuggestions = async () => {
    setIsLoading(true);
    setSuggestions(null);

    try {
      const result = await getDispatchingSuggestions({
        availableDrivers: availableDrivers.map(d => ({
          driverId: d.id,
          currentLocation: `(${d.location.x}, ${d.location.y})`,
          availabilityStatus: 'available',
        })),
        pendingRideRequests: pendingRides.map(r => ({
          requestId: r.id,
          pickupLocation: r.pickup.name,
          dropoffLocation: r.dropoff?.name || 'Unknown destination',
          passengerCount: r.passengerCount || 1,
          movingFee: r.movingFee,
          scheduledTime: r.scheduledTime?.toISOString(),
        })),
      });
      setSuggestions(result);
       if (result.driverAssignmentSuggestions.length === 0 && result.driverReassignmentSuggestions.length === 0) {
        toast({
          title: "No new suggestions",
          description: "Current dispatch assignments are optimal.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Suggestion Failed",
        description: "Could not get dispatch suggestions. Please try again.",
      });
      console.error("Suggestion failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="flex-1">
      <CardHeader>
        <CardTitle>AI Dispatch Assistant</CardTitle>
        <CardDescription>Get optimal driver assignments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleGetSuggestions} disabled={isLoading || pendingRides.length === 0} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          {isLoading ? 'Analyzing...' : 'Get Suggestions'}
        </Button>

        {suggestions?.driverAssignmentSuggestions && suggestions.driverAssignmentSuggestions.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">New Assignments</h4>
            {suggestions.driverAssignmentSuggestions.map((s, i) => (
              <Alert key={`assign-${i}`}>
                <Truck className="h-4 w-4" />
                <AlertTitle>Assign Driver {s.driverId.split('-')[1]} to Ride {s.rideRequestId.split('-')[1]}</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-xs italic flex-1 mr-2">{s.reason}</span>
                  <Button size="sm" variant="secondary" onClick={() => onAssignSuggestion(s.rideRequestId, s.driverId)}>Accept</Button>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
