'use client';

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTraccar } from '@/context/traccar-context';
import traccarService from '@/lib/traccar-service';
import Map, { Marker } from 'react-map-gl/maplibre';
import { Truck, MapPin, RefreshCw, ExternalLink, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TraccarMapViewProps {
  className?: string;
  mode?: 'embedded' | 'custom' | 'both';
  height?: string;
}

export function TraccarMapView({ 
  className, 
  mode = 'both',
  height = '600px'
}: TraccarMapViewProps) {
  const { 
    devices, 
    positions, 
    loading, 
    authenticated, 
    login, 
    refreshData,
    getOnlineDevices 
  } = useTraccar();
  
  const [loginCredentials, setLoginCredentials] = useState({
    email: '',
    password: ''
  });
  
  const [isClientMounted, setIsClientMounted] = useState(false);
  
  // Initialize credentials after client mount to avoid hydration mismatch
  useEffect(() => {
    setIsClientMounted(true);
    setLoginCredentials({
      email: process.env.NEXT_PUBLIC_TRACCAR_EMAIL || 'admin',
      password: process.env.NEXT_PUBLIC_TRACCAR_PASSWORD || 'admin'
    });
  }, []);

  const handleLogin = async () => {
    await login(loginCredentials.email, loginCredentials.password);
  };

  const mapCenter = useMemo(() => {
    if (positions.length > 0) {
      const validPositions = positions.filter(p => p.valid && p.latitude && p.longitude);
      if (validPositions.length > 0) {
        const avgLat = validPositions.reduce((sum, p) => sum + p.latitude, 0) / validPositions.length;
        const avgLng = validPositions.reduce((sum, p) => sum + p.longitude, 0) / validPositions.length;
        return { longitude: avgLng, latitude: avgLat };
      }
    }
    // Default to Augusta, Maine
    return { longitude: -69.7795, latitude: 44.3106 };
  }, [positions]);

  const activeDevices = devices.filter(d => !d.disabled);
  const onlineDevices = getOnlineDevices();

  const EmbeddedTraccarMap = () => (
    <div className="relative w-full" style={{ height }}>
      <iframe
        src={traccarService.getWebInterfaceUrl()}
        className="w-full h-full border-0 rounded-lg"
        title="Traccar Map"
        allow="geolocation"
      />
      <div className="absolute top-2 right-2 z-10">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={() => window.open(traccarService.getWebInterfaceUrl(), '_blank')}
        >
          <ExternalLink className="w-4 h-4 mr-1" />
          Open Full Screen
        </Button>
      </div>
    </div>
  );

  const CustomMap = () => (
    <div className="relative w-full" style={{ height }}>
      <Map
        initialViewState={{
          ...mapCenter,
          zoom: 11,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://demotiles.maplibre.org/style.json"
      >
        {positions
          .filter(position => position.valid && position.latitude && position.longitude)
          .map(position => {
            const device = devices.find(d => d.id === position.deviceId);
            const isOnline = device?.status === 'online';
            
            return (
              <Marker 
                key={`${position.deviceId}-${position.id}`} 
                longitude={position.longitude} 
                latitude={position.latitude}
              >
                <div className="relative">
                  <Truck
                    className={cn(
                      "rounded-full bg-white p-1",
                      isOnline ? "text-green-600" : "text-gray-400"
                    )}
                    size={32}
                  />
                  {device && (
                    <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                      {device.name}
                    </div>
                  )}
                </div>
              </Marker>
            );
          })}
      </Map>
      
      {/* Refresh button */}
      <div className="absolute top-2 right-2 z-10">
        <Button 
          size="sm" 
          variant="outline" 
          onClick={refreshData} 
          disabled={loading}
        >
          <RefreshCw className={cn("w-4 h-4 mr-1", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>
    </div>
  );

  if (!authenticated) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Traccar Fleet Map</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Connect to Traccar server to view fleet positions
            </div>
            {isClientMounted && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <input
                    type="email"
                    value={loginCredentials.email}
                    onChange={(e) => setLoginCredentials(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <input
                    type="password"
                    value={loginCredentials.password}
                    onChange={(e) => setLoginCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full mt-1 p-2 border rounded"
                  />
                </div>
              </div>
            )}
            <Button onClick={handleLogin} disabled={loading}>
              {loading ? 'Connecting...' : 'Connect to Traccar'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Stats */}
      <div className="flex gap-4 mb-4">
        <Badge variant="outline">
          Total Devices: {devices.length}
        </Badge>
        <Badge variant="outline">
          Active: {activeDevices.length}
        </Badge>
        <Badge variant="outline" className="text-green-600">
          Online: {onlineDevices.length}
        </Badge>
        <Badge variant="outline">
          Last Update: {new Date().toLocaleTimeString()}
        </Badge>
      </div>

      {mode === 'both' ? (
        <Tabs defaultValue="custom" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="custom">Custom Map</TabsTrigger>
            <TabsTrigger value="embedded">Traccar Interface</TabsTrigger>
          </TabsList>
          <TabsContent value="custom">
            <CustomMap />
          </TabsContent>
          <TabsContent value="embedded">
            <EmbeddedTraccarMap />
          </TabsContent>
        </Tabs>
      ) : mode === 'embedded' ? (
        <EmbeddedTraccarMap />
      ) : (
        <CustomMap />
      )}

      {/* Device List */}
      <div className="mt-4 space-y-2">
        <h3 className="text-lg font-semibold">Fleet Status</h3>
        <div className="grid gap-2 max-h-40 overflow-y-auto">
          {devices.map(device => {
            const position = positions.find(p => p.deviceId === device.id);
            return (
              <div key={device.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    device.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                  )} />
                  <span className="font-medium">{device.name}</span>
                  <Badge variant={device.disabled ? "destructive" : "secondary"}>
                    {device.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {position ? (
                    <>
                      {position.speed ? `${Math.round(position.speed * 1.852)} km/h` : '0 km/h'}
                      {position.address && ` • ${position.address.substring(0, 30)}...`}
                    </>
                  ) : (
                    'No recent position'
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}