"use client";

import Image from 'next/image';
import type { Ride, Driver } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Truck, MapPin, User, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type MapViewProps = {
  rides: Ride[];
  drivers: Driver[];
};

export function MapView({ rides, drivers }: MapViewProps) {
  const activeRidePickups = rides.filter(r => ['pending', 'assigned'].includes(r.status));

  return (
    <Card>
      <CardContent className="p-2">
        <TooltipProvider>
          <div className="relative w-full aspect-[2/1] overflow-hidden rounded-lg bg-secondary">
            <Image
              src="https://picsum.photos/1200/600"
              alt="City Map"
              data-ai-hint="city map"
              fill
              className="object-cover opacity-30"
            />
            
            {/* Render Drivers */}
            {drivers.map(driver => (
              <Tooltip key={driver.id}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute transition-all duration-1000 ease-linear"
                    style={{ left: `${driver.location.x}%`, top: `${driver.location.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <Truck
                      className={cn(
                        'h-6 w-6 transition-colors',
                        driver.status === 'available' && 'text-green-500',
                        driver.status === 'on-ride' && 'text-blue-500',
                        driver.status === 'offline' && 'text-muted-foreground opacity-50'
                      )}
                      strokeWidth={driver.status === 'offline' ? 1.5 : 2.5}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className='font-bold'>{driver.name}</p>
                  <p>Status: <span className='capitalize'>{driver.status.replace('-', ' ')}</span></p>
                  <p>Rating: {driver.rating}★</p>
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Render Ride Pickups */}
            {activeRidePickups.map(ride => (
               <Tooltip key={`pickup-${ride.id}`}>
                <TooltipTrigger asChild>
                   <div
                    className="absolute"
                    style={{ left: `${ride.pickup.coords.x}%`, top: `${ride.pickup.coords.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <User className="h-5 w-5 text-yellow-500" />
                  </div>
                </TooltipTrigger>
                 <TooltipContent>
                  <p className='font-bold'>Pickup for {ride.passengerPhone}</p>
                  <p>{ride.pickup.name}</p>
                </TooltipContent>
              </Tooltip>
            ))}

          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
