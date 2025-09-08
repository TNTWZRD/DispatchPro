
"use client";

import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import type { Ride, Driver, RideStatus, PaymentMethod } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RideCard } from './ride-card';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Truck } from 'lucide-react';

type DriverColumnProps = {
  driver: Driver;
  ride: Ride | undefined;
  allDrivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
  onSetFare: (rideId: string, fare: number, paymentMethod: PaymentMethod) => void;
};

export function DriverColumn({ driver, ride, allDrivers, onAssignDriver, onChangeStatus, onSetFare }: DriverColumnProps) {
  const isAvailable = driver.status === 'available';

  return (
    <Droppable droppableId={driver.id} isDropDisabled={!isAvailable}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "w-80 shrink-0 flex flex-col",
            snapshot.isDraggingOver && "bg-primary/20",
            !isAvailable && "bg-muted/50"
          )}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={`https://i.pravatar.cc/40?u=${driver.id}`} />
                <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className='flex flex-col'>
                <span>{driver.name}</span>
                 <span className={cn(
                    "text-xs font-medium capitalize",
                    driver.status === 'available' && 'text-green-500',
                    driver.status === 'on-ride' && 'text-blue-500',
                 )}>
                    {driver.status.replace('-', ' ')}
                 </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            {ride ? (
              <RideCard
                ride={ride}
                drivers={allDrivers}
                onAssignDriver={onAssignDriver}
                onChangeStatus={onChangeStatus}
                onSetFare={onSetFare}
              />
            ) : (
                <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground p-4">
                  {isAvailable ? (
                    <p>Available for new ride. Drag a pending ride here to assign.</p>
                  ) : (
                     <p>Currently on a ride.</p>
                  )}
                </div>
            )}
            {provided.placeholder}
          </CardContent>
        </Card>
      )}
    </Droppable>
  );
}
