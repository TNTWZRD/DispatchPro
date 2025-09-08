"use client";

import type { Ride, Driver, RideStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RideCard } from './ride-card';

type RideListProps = {
  title: string;
  rides: Ride[];
  drivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
  onEstimateEta: (ride: Ride) => void;
};

export function RideList({ title, rides, drivers, onAssignDriver, onChangeStatus, onEstimateEta }: RideListProps) {
  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          {rides.length > 0 ? (
            <div className="space-y-4 pr-4">
              {rides.map(ride => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  drivers={drivers}
                  onAssignDriver={onAssignDriver}
                  onChangeStatus={onChangeStatus}
                  onEstimateEta={onEstimateEta}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <p>No rides to display.</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
