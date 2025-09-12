
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import type { Shift, Driver, Vehicle } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, PowerOff } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { endShift } from '@/app/admin/actions';
import { formatUserName } from '@/lib/utils';

export function ShiftManagementTable() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const shiftsQuery = query(collection(db, 'shifts'), orderBy('startTime', 'desc'));
    const unsubShifts = onSnapshot(shiftsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
      }) as Shift);
      setShifts(data);
      if(loading) setLoading(false);
    });

    const driversQuery = query(collection(db, 'drivers'));
    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
      if(loading) setLoading(false);
    });

    const vehiclesQuery = query(collection(db, 'vehicles'));
    const unsubVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
      if(loading) setLoading(false);
    });

    return () => {
      unsubShifts();
      unsubDrivers();
      unsubVehicles();
    };
  }, [loading]);

  const getDriverName = (driverId: string) => {
    const driver = drivers.find(d => d.id === driverId);
    return driver ? formatUserName(driver.name) : 'Unknown';
  }

  const getVehicleNickname = (vehicleId: string) => vehicles.find(v => v.id === vehicleId)?.nickname || 'Unknown';
  
  const handleEndShift = async (shift: Shift) => {
    const result = await endShift(shift.id, shift.driverId, shift.vehicleId);
    if (result.type === 'success') {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell>
                <Badge className={shift.status === 'active' ? 'bg-green-600' : 'bg-gray-500'}>
                  {shift.status}
                </Badge>
              </TableCell>
              <TableCell>{getDriverName(shift.driverId)}</TableCell>
              <TableCell>{getVehicleNickname(shift.vehicleId)}</TableCell>
              <TableCell>{format(shift.startTime, 'PPpp')}</TableCell>
              <TableCell>{shift.endTime ? format(shift.endTime, 'PPpp') : 'N/A'}</TableCell>
              <TableCell className="text-right">
                {shift.status === 'active' && (
                    <Button variant="destructive" size="sm" onClick={() => handleEndShift(shift)}>
                       <PowerOff className="mr-2" /> End Shift
                    </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
