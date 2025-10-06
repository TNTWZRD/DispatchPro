
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
  onSetFare: (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number | null; card?: number | null; check?: number | null; tip?: number | null; } }) => void;
  onUnassignDriver: (rideId: string) => void;
};

export function RideList({ title, rides, drivers, onAssignDriver, onChangeStatus, onSetFare, onUnassignDriver }: RideListProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <ScrollArea className="h-full">
          {rides.length > 0 ? (
            <div className="space-y-2 pr-2">
              {rides.map(ride => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  shifts={[]}
                  onAssignDriver={onAssignDriver}
                  onChangeStatus={onChangeStatus}
                  onSetFare={onSetFare}
                  onUnassignDriver={onUnassignDriver}
                  onEdit={() => {}}
                  onUnschedule={() => {}}
                  onToggleStar={async () => ({ type: 'success', message: 'Toggled' })}
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
