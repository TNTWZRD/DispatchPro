
"use client";

import React from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import type { Ride, Driver } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCondensedMode } from '../context/condensed-mode-context';

const mapCenter = { lat: 44.3106, lng: -69.7795 }; // Augusta, ME

const locationToCoords = (loc: {x: number, y: number}): { lat: number; lng: number } => {
    // This is a mock conversion. In a real app, you'd use a geocoding service
    // or have real coordinates. For now, we'll map the 0-100 space to a small
    // area around the map center.
    const latOffset = (loc.y - 50) / 500; // ~0.2 degrees latitude range
    const lngOffset = (loc.x - 50) / 400; // ~0.25 degrees longitude at this latitude
    return { lat: mapCenter.lat + latOffset, lng: mapCenter.lng + lngOffset };
}

type MapViewProps = {
  rides: Ride[];
  drivers: Driver[];
};

export function MapView({ rides, drivers }: MapViewProps) {
  const activeRidePickups = rides.filter(r => ['pending', 'assigned'].includes(r.status));
  const { isCondensed } = useCondensedMode();

  return (
    <Card>
      <CardContent className="p-2">
        <div className="relative w-full aspect-[2/1] overflow-hidden rounded-lg bg-secondary">
          <Map
            defaultCenter={mapCenter}
            defaultZoom={13}
            gestureHandling={'greedy'}
            disableDefaultUI={true}
            mapId={process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || 'DISPATCHPRO_MAP'}
          >
            {drivers.map(driver => (
              <AdvancedMarker key={driver.id} position={locationToCoords(driver.location)}>
                  <Tooltip text={`${driver.name} (${driver.status.replace('-', ' ')})`}>
                    <Truck
                        className={cn(
                            'h-7 w-7 p-1 rounded-full bg-background border-2 shadow-lg',
                            driver.status === 'available' && 'text-green-500 border-green-500',
                            driver.status === 'on-shift' && 'text-blue-500 border-blue-500',
                            driver.status === 'offline' && 'text-muted-foreground border-muted-foreground opacity-60'
                        )}
                        strokeWidth={2.5}
                    />
                  </Tooltip>
              </AdvancedMarker>
            ))}
            {activeRidePickups.map(ride => (
              <AdvancedMarker key={`pickup-${ride.id}`} position={locationToCoords(ride.pickup.coords)}>
                  <Tooltip text={`Pickup: ${ride.pickup.name}`}>
                    <User className="h-7 w-7 p-1 rounded-full bg-background border-2 border-yellow-500 text-yellow-500 shadow-lg" />
                  </Tooltip>
              </AdvancedMarker>
            ))}
          </Map>
        </div>
      </CardContent>
    </Card>
  );
};

const Tooltip = ({ children, text }: { children: React.ReactNode, text: string }) => {
    const [show, setShow] = React.useState(false);
    return (
        <div className="relative flex flex-col items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            {show && (
                <div className="absolute bottom-full mb-2 w-max px-2 py-1 text-sm text-white bg-black/70 rounded-md shadow-lg">
                    {text}
                </div>
            )}
        </div>
    )
}
