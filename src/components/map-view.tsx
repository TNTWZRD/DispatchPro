"use client";

import React from 'react';
import { MapContainer, TileLayer, Marker, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Ride, Driver } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCondensedMode } from '../context/condensed-mode-context';
import ReactDOMServer from 'react-dom/server';

const mapCenter: L.LatLngTuple = [44.3106, -69.7795]; // Augusta, ME

const locationToCoords = (loc: {x: number, y: number}): L.LatLngTuple => {
    const latOffset = (loc.y - 50) / 500;
    const lngOffset = (loc.x - 50) / 400;
    return [mapCenter[0] + latOffset, mapCenter[1] + lngOffset];
}

const createIcon = (icon: React.ReactElement) => {
    return L.divIcon({
        html: ReactDOMServer.renderToString(icon),
        className: 'bg-transparent border-0',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });
};

const driverIcon = (driver: Driver) => createIcon(
    <Truck
        className={cn(
            'h-8 w-8 p-1.5 rounded-full bg-background border-2 shadow-lg',
            driver.status === 'available' && 'text-green-500 border-green-500',
            driver.status === 'on-shift' && 'text-blue-500 border-blue-500',
            driver.status === 'offline' && 'text-muted-foreground border-muted-foreground opacity-60'
        )}
        strokeWidth={2.5}
    />
);

const userIcon = createIcon(
    <User className="h-8 w-8 p-1.5 rounded-full bg-background border-2 border-yellow-500 text-yellow-500 shadow-lg" />
);

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
           <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {drivers.map(driver => (
              <Marker key={driver.id} position={locationToCoords(driver.location)} icon={driverIcon(driver)}>
                <LeafletTooltip>
                    {driver.name} ({driver.status.replace('-', ' ')})
                </LeafletTooltip>
              </Marker>
            ))}
            {activeRidePickups.map(ride => (
              <Marker key={`pickup-${ride.id}`} position={locationToCoords(ride.pickup.coords)} icon={userIcon}>
                 <LeafletTooltip>
                    Pickup: {ride.pickup.name}
                 </LeafletTooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
};
