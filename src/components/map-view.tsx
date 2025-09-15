"use client";

import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Tooltip as LeafletTooltip } from 'react-leaflet';
import L from 'leaflet';
import type { Ride, Driver } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip as ShadTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderToStaticMarkup } from 'react-dom/server';

const createIcon = (icon: React.ReactElement) => {
  return L.divIcon({
    html: renderToStaticMarkup(icon),
    className: 'bg-transparent border-none',
    iconSize: [24, 24],
    iconAnchor: [12, 24],
  });
};

const driverIcon = (status: Driver['status']) => createIcon(
    <Truck
        className={cn(
            'h-6 w-6 transition-colors',
            status === 'available' && 'text-green-500',
            status === 'on-shift' && 'text-blue-500',
            status === 'offline' && 'text-muted-foreground opacity-50'
        )}
        strokeWidth={status === 'offline' ? 1.5 : 2.5}
    />
);
const passengerIcon = createIcon(<User className="h-5 w-5 text-yellow-500" />);

type MapViewProps = {
  rides: Ride[];
  drivers: Driver[];
};

const mapCenter: L.LatLngExpression = [44.3106, -69.7795]; // Augusta, ME

const locationToCoords = (loc: {x: number, y: number}): L.LatLngExpression => {
    // This is a mock conversion. In a real app, you'd use a geocoding service
    // or have real coordinates. For now, we'll map the 0-100 space to a small
    // area around the map center.
    const latOffset = (loc.y - 50) / 500; // ~0.2 degrees latitude range
    const lngOffset = (loc.x - 50) / 400; // ~0.25 degrees longitude at this latitude
    return [mapCenter[0] + latOffset, mapCenter[1] + lngOffset];
}

export function MapView({ rides, drivers }: MapViewProps) {
  const activeRidePickups = rides.filter(r => ['pending', 'assigned'].includes(r.status));

  return (
    <Card>
      <CardContent className="p-2">
        <div className="relative w-full aspect-[2/1] overflow-hidden rounded-lg bg-secondary">
           <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Render Drivers */}
            {drivers.map(driver => (
              <Marker key={driver.id} position={locationToCoords(driver.location)} icon={driverIcon(driver.status)}>
                  <LeafletTooltip>
                      <p className='font-bold'>{driver.name}</p>
                      <p>Status: <span className='capitalize'>{driver.status.replace('-', ' ')}</span></p>
                      <p>Rating: {driver.rating}★</p>
                  </LeafletTooltip>
              </Marker>
            ))}

            {/* Render Ride Pickups */}
            {activeRidePickups.map(ride => (
              <Marker key={`pickup-${ride.id}`} position={locationToCoords(ride.pickup.coords)} icon={passengerIcon}>
                  <LeafletTooltip>
                      <p className='font-bold'>Pickup for {ride.passengerPhone || 'Unknown'}</p>
                      <p>{ride.pickup.name}</p>
                  </LeafletTooltip>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </CardContent>
    </Card>
  );
}
