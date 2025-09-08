"use client";

import type { Ride, Driver, RideStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User, Phone, MapPin, Clock, MoreVertical, Truck, Bot, CheckCircle2, Loader2, XCircle, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type RideCardProps = {
  ride: Ride;
  drivers: Driver[];
  onAssignDriver: (rideId: string, driverId: string) => void;
  onChangeStatus: (rideId: string, newStatus: RideStatus) => void;
  onEstimateEta: (ride: Ride) => void;
};

const statusConfig: Record<RideStatus, { color: string; icon: React.ReactNode }> = {
  pending: { color: 'bg-yellow-400', icon: <Clock className="h-3 w-3" /> },
  assigned: { color: 'bg-blue-500', icon: <Truck className="h-3 w-3" /> },
  'in-progress': { color: 'bg-indigo-500', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  completed: { color: 'bg-green-500', icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { color: 'bg-red-500', icon: <XCircle className="h-3 w-3" /> },
};

export function RideCard({ ride, drivers, onAssignDriver, onChangeStatus, onEstimateEta }: RideCardProps) {
  const assignedDriver = drivers.find(d => d.id === ride.driverId);
  const availableDrivers = drivers.filter(d => d.status === 'available');

  const getStatusBadge = (status: RideStatus) => {
    const config = statusConfig[status];
    return (
      <Badge className={cn('capitalize text-white', config.color)}>
        {config.icon}
        <span className="ml-1.5">{status.replace('-', ' ')}</span>
      </Badge>
    );
  };

  return (
    <Card className={cn("transition-all", ride.isNew && "animate-pulse border-accent")}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">{ride.passengerName}</CardTitle>
          {getStatusBadge(ride.status)}
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Phone className="mr-2 h-4 w-4" />
          <span>{ride.passengerPhone}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center">
          <MapPin className="mr-2 h-4 w-4 text-green-500" />
          <span className="font-medium">From:</span>
          <span className="ml-2 truncate">{ride.pickup.name}</span>
        </div>
        <div className="flex items-center">
          <MapPin className="mr-2 h-4 w-4 text-red-500" />
          <span className="font-medium">To:</span>
          <span className="ml-2 truncate">{ride.dropoff.name}</span>
        </div>
        {assignedDriver && (
          <div className="flex items-center pt-1">
            <Truck className="mr-2 h-4 w-4 text-primary" />
            <span className="font-medium">Driver:</span>
            <span className="ml-2">{assignedDriver.name}</span>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex items-center text-xs text-muted-foreground">
          <Clock className="mr-1.5 h-3 w-3" />
          <span>{formatDistanceToNow(ride.requestTime, { addSuffix: true })}</span>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => onEstimateEta(ride)}>
            <Bot className="h-4 w-4 mr-2" /> ETA
          </Button>

          {ride.status === 'pending' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">Assign Driver</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {availableDrivers.length > 0 ? (
                  availableDrivers.map(driver => (
                    <DropdownMenuItem key={driver.id} onClick={() => onAssignDriver(ride.id, driver.id)}>
                      {driver.name} ({driver.rating}★)
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No drivers available</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {['assigned', 'in-progress'].includes(ride.status) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {ride.status === 'assigned' && <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'in-progress')}>Mark In Progress</DropdownMenuItem>}
                {ride.status === 'in-progress' && <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'completed')}>Mark Completed</DropdownMenuItem>}
                <DropdownMenuItem onClick={() => onChangeStatus(ride.id, 'cancelled')} className="text-destructive">
                  Cancel Ride
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
