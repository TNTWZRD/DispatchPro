
"use client";

import React, { useState, useMemo } from 'react';
import type { Ride, Driver, RideStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RideCard } from './ride-card';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useIsMobile } from '@/hooks/use-mobile';
import { StrictModeDroppable } from './strict-mode-droppable';
import { CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Separator } from './ui/separator';

type DriverColumnProps = {
  driver: Driver;
  rides: Ride[];
  allDrivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
  onSetFare: (rideId: string, details: { totalFare: number; paymentDetails: { cash?: number; card?: number; check?: number; tip?: number; } }) => void;
  onUnassignDriver: (rideId: string) => void;
  onEditRide: (ride: Ride) => void;
  onUnscheduleRide: (rideId: string) => void;
  style?: React.CSSProperties;
};

const statusSortOrder: Record<RideStatus, number> = {
  'in-progress': 1,
  'assigned': 2,
  'pending': 3,
  'completed': 4,
  'cancelled': 5,
};

export function DriverColumn({ driver, rides, allDrivers, onAssignDriver, onChangeStatus, onSetFare, onUnassignDriver, onEditRide, onUnscheduleRide, style }: DriverColumnProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  
  const isMobile = useIsMobile();
  
  const activeRides = useMemo(() => {
    return rides
      .filter(r => r.status === 'assigned' || r.status === 'in-progress')
      .sort((a, b) => statusSortOrder[a.status] - statusSortOrder[b.status]);
  }, [rides]);

  const completedRides = rides.filter(r => r.status === 'completed');
  
  const hasActiveRides = activeRides.length > 0;
  const hasCompletedRides = completedRides.length > 0;

  const renderContent = () => (
    <>
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
      <CardContent className="flex-1 overflow-y-auto space-y-2 p-2">
        {hasActiveRides && (
          activeRides.map(ride => (
            <RideCard
              key={ride.id}
              ride={ride}
              drivers={allDrivers}
              onAssignDriver={onAssignDriver}
              onChangeStatus={onChangeStatus}
              onSetFare={onSetFare}
              onUnassignDriver={onUnassignDriver}
              onEdit={onEditRide}
              onUnschedule={onUnscheduleRide}
            />
          ))
        )}
        
        {showCompleted && hasCompletedRides && (
          <div className={cn(hasActiveRides && 'pt-4 mt-4 border-t')}>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Completed Rides
            </h4>
            <div className="space-y-2">
              {completedRides.map(ride => (
                <RideCard
                  key={ride.id}
                  ride={ride}
                  drivers={allDrivers}
                  onAssignDriver={onAssignDriver}
                  onChangeStatus={onChangeStatus}
                  onSetFare={onSetFare}
                  onUnassignDriver={onUnassignDriver}
                  onEdit={onEditRide}
                  onUnschedule={onUnscheduleRide}
                />
              ))}
            </div>
          </div>
        )}
        
        {!hasActiveRides && !showCompleted && (
            <div className="flex h-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground p-4">
              <p>Available for rides. Drag a pending ride here to assign.</p>
            </div>
        )}
        
      </CardContent>
      {hasCompletedRides && (
        <CardFooter className="p-2 mt-auto">
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowCompleted(!showCompleted)}>
            {showCompleted ? <ChevronUp/> : <ChevronDown/>}
            {showCompleted ? 'Hide' : 'Show'} Completed ({completedRides.length})
          </Button>
        </CardFooter>
      )}
    </>
  );

  if (isMobile) {
    return (
      <div className="w-full shrink-0 flex flex-col space-y-4">
        <Card>
          {renderContent()}
        </Card>
      </div>
    );
  }

  return (
    <StrictModeDroppable droppableId={driver.id} isDropDisabled={driver.status === 'offline'}>
      {(provided, snapshot) => (
        <Card
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            "shrink-0 flex flex-col",
            snapshot.isDraggingOver && "bg-primary/20",
            driver.status === 'offline' && "bg-muted/50"
          )}
          style={style}
        >
          {renderContent()}
          {provided.placeholder}
        </Card>
      )}
    </StrictModeDroppable>
  );
}
