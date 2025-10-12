"use client";

import React from 'react';
import { TraccarMapView } from '@/components/TraccarMapView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTraccar } from '@/context/traccar-context';
import { Badge } from '@/components/ui/badge';
import { Truck, Users, MapPin, Activity } from 'lucide-react';

export default function FleetPage() {
  const { devices, positions, authenticated, loading, getOnlineDevices } = useTraccar();
  
  const onlineDevices = getOnlineDevices();
  const totalDevices = devices.length;
  const activePositions = positions.filter(p => p.valid).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Fleet Management</h1>
        <Badge variant={authenticated ? "default" : "destructive"}>
          {authenticated ? "Connected to Traccar" : "Disconnected"}
        </Badge>
      </div>

      {/* Fleet Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">
              Fleet size
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Vehicles</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onlineDevices.length}</div>
            <p className="text-xs text-muted-foreground">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePositions}</div>
            <p className="text-xs text-muted-foreground">
              Valid GPS positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Status</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalDevices > 0 ? Math.round((onlineDevices.length / totalDevices) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Availability rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Traccar Map */}
      <TraccarMapView 
        className="w-full"
        mode="both" 
        height="70vh"
      />
    </div>
  );
}