
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where, Timestamp } from 'firebase/firestore';
import type { Shift, Driver, Vehicle, Ride } from '@/lib/types';
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
import { Loader2, PowerOff, MoreHorizontal, Edit, FileText, DollarSign } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { endShift } from '@/app/admin/actions';
import { formatUserName } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from './ui/dropdown-menu';
import { ShiftNotesForm } from './shift-notes-form';

type ShiftManagementTableProps = {
    selectedDate: Date;
}

export function ShiftManagementTable({ selectedDate }: ShiftManagementTableProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);

    const start = startOfDay(selectedDate);
    const end = endOfDay(selectedDate);

    const shiftsQuery = query(
        collection(db, 'shifts'), 
        where('startTime', '>=', Timestamp.fromDate(start)),
        where('startTime', '<=', Timestamp.fromDate(end)),
        orderBy('startTime', 'desc')
    );

    const unsubShifts = onSnapshot(shiftsQuery, (snapshot) => {
      setShifts(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate(),
        endTime: doc.data().endTime?.toDate(),
      }) as Shift));
      setLoading(false);
    });

    const driversQuery = query(collection(db, 'drivers'));
    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
      setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
    });

    const vehiclesQuery = query(collection(db, 'vehicles'));
    const unsubVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      setVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });

    // We fetch all completed rides and filter in memory, as Firestore doesn't allow range filters on different fields.
    const ridesQuery = query(collection(db, 'rides'), where('status', '==', 'completed'));
    const unsubRides = onSnapshot(ridesQuery, (snapshot) => {
      setRides(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        droppedOffAt: doc.data().droppedOffAt?.toDate(),
      }) as Ride));
    });

    return () => {
      unsubShifts();
      unsubDrivers();
      unsubVehicles();
      unsubRides();
    };
  }, [selectedDate]);

  const shiftData = useMemo(() => {
    return shifts.map(shift => {
      const completedRides = rides.filter(ride => 
          ride.shiftId === shift.id && 
          ride.status === 'completed' &&
          ride.droppedOffAt &&
          ride.droppedOffAt >= shift.startTime &&
          (!shift.endTime || ride.droppedOffAt <= shift.endTime)
      );
      const totalFare = completedRides.reduce((sum, ride) => sum + (ride.totalFare || 0), 0);
      return {
        ...shift,
        totalFare,
      };
    });
  }, [shifts, rides]);


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

  if (shifts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 rounded-lg border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
            <p className="text-lg font-medium">No Shifts Found</p>
            <p>There were no shifts on {format(selectedDate, 'PPP')}.</p>
        </div>
      )
  }

  return (
    <>
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Driver</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Start Time</TableHead>
            <TableHead>End Time</TableHead>
            <TableHead>Total Fare</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shiftData.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell>
                <Badge className={shift.status === 'active' ? 'bg-green-600' : 'bg-gray-500'}>
                  {shift.status}
                </Badge>
              </TableCell>
              <TableCell>{getDriverName(shift.driverId)}</TableCell>
              <TableCell>{getVehicleNickname(shift.vehicleId)}</TableCell>
              <TableCell>{format(shift.startTime, 'p')}</TableCell>
              <TableCell>{shift.endTime ? format(shift.endTime, 'p') : 'N/A'}</TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {shift.totalFare.toFixed(2)}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => {}} disabled>
                           <Edit /> Edit Shift
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setEditingShift(shift)}>
                            <FileText /> Add/Edit Notes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {shift.status === 'active' && (
                            <DropdownMenuItem onSelect={() => handleEndShift(shift)} className="text-destructive">
                                <PowerOff /> End Shift
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    
    <ShiftNotesForm
        shift={editingShift}
        isOpen={!!editingShift}
        onOpenChange={(isOpen) => {
            if(!isOpen) setEditingShift(null);
        }}
    />
    </>
  );
}
