
'use client';

import { useMemo } from 'react';
import Map, { Marker } from 'react-map-gl/maplibre';
import type { Ride, Driver } from '@/lib/types';
import { Truck, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type MapViewProps = {
  rides: Ride[];
  drivers: Driver[];
};

export function MapView({ rides, drivers }: MapViewProps) {
  const mapCenter = useMemo(() => {
    if (drivers.length > 0) {
      const avgX = drivers.reduce((sum, d) => sum + d.location.x, 0) / drivers.length;
      const avgY = drivers.reduce((sum, d) => sum + d.location.y, 0) / drivers.length;
      return { longitude: avgY, latitude: avgX };
    }
    // Default center if no drivers
    return { longitude: -74.006, latitude: 40.7128 };
  }, [drivers]);

  return (
    <Card className="h-full w-full">
      <CardHeader>
        <CardTitle>Live Map</CardTitle>
      </CardHeader>
      <CardContent className="p-2 h-[calc(100%-4rem)]">
        <div className="relative w-full h-full overflow-hidden rounded-lg bg-secondary">
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
      </CardContent>
    </Card>
  );
}
