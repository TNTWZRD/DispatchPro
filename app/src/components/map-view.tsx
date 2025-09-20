
'use client';

import { useMemo } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import type { Ride, Driver } from '@/lib/types';
import { Truck, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type MapViewProps = {
  rides: Ride[];
  drivers: Driver[];
  className?: string;
};

export function MapView({ rides, drivers, className }: MapViewProps) {
  const mapCenter = useMemo(() => {
    // Default center to Augusta, Maine
    return { longitude: -69.7795, latitude: 44.3106 };
  }, []);

  return (
      <div className={cn("relative w-full h-full overflow-hidden rounded-lg bg-secondary", className)}>
        <Map
          initialViewState={{
            ...mapCenter,
            zoom: 11,
          }}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://demotiles.maplibre.org/style.json"
        >
          {drivers
            .filter(d => d.status === 'on-shift' || d.status === 'available')
            .map(driver => (
              <Marker key={driver.id} longitude={driver.location.y} latitude={driver.location.x}>
                <Truck
                  className="text-blue-600 bg-white rounded-full p-1"
                  size={32}
                />
              </Marker>
          ))}
          {rides.map(ride => (
            <Marker key={ride.id} longitude={ride.pickup.coords.y} latitude={ride.pickup.coords.x}>
                <MapPin
                  className="text-yellow-500"
                  size={32}
                />
            </Marker>
          ))}
        </Map>
      </div>
  );
}
