"use client";

import type { Ride, Driver } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type RideHistoryTableProps = {
  rides: Ride[];
  drivers: Driver[];
};

export function RideHistoryTable({ rides, drivers }: RideHistoryTableProps) {
    const getDriverName = (driverId: string | null) => {
        if (!driverId) return 'N/A';
        return drivers.find(d => d.id === driverId)?.name || 'Unknown';
    };
    
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Status</TableHead>
          <TableHead>Passenger</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead>Pickup</TableHead>
          <TableHead>Dropoff</TableHead>
          <TableHead>Requested</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rides.map(ride => (
          <TableRow key={ride.id}>
            <TableCell>
              <Badge variant={ride.status === 'completed' ? 'default' : 'destructive'} className={ride.status === 'completed' ? 'bg-green-600' : ''}>
                {ride.status}
              </Badge>
            </TableCell>
            <TableCell>{ride.passengerName}</TableCell>
            <TableCell>{getDriverName(ride.driverId)}</TableCell>
            <TableCell>{ride.pickup.name}</TableCell>
            <TableCell>{ride.dropoff.name}</TableCell>
            <TableCell>{format(ride.requestTime, 'PPpp')}</TableCell>
            <TableCell>
              {ride.completionTime ? format(ride.completionTime, 'PPpp') : 'N/A'}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
