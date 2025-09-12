
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import type { Vehicle, Driver } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';


const getStatusVariant = (status: Vehicle['status']) => {
    switch (status) {
        case 'active': return 'bg-green-600 hover:bg-green-700';
        case 'maintenance': return 'bg-yellow-500 hover:bg-yellow-600';
        case 'decommissioned': return 'bg-red-600 hover:bg-red-700';
        default: return 'bg-gray-500';
    }
}


export function VehicleManagementTable() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const vehiclesQuery = query(collection(db, 'vehicles'), orderBy('createdAt', 'desc'));
    const unsubVehicles = onSnapshot(vehiclesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          ...docData,
          id: doc.id,
          createdAt: docData.createdAt?.toDate(),
          updatedAt: docData.updatedAt?.toDate(),
        } as Vehicle;
      });
      setVehicles(data);
      setLoading(false);
    });

    const driversQuery = query(collection(db, 'drivers'));
    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver));
        setDrivers(data);
    });

    return () => {
        unsubVehicles();
        unsubDrivers();
    };
  }, []);

  const getDriverName = (driverId: string | null | undefined) => {
    if (!driverId) return 'Unassigned';
    return drivers.find(d => d.id === driverId)?.name || 'Unknown Driver';
  }

  const handleStatusChange = async (vehicleId: string, status: Vehicle['status']) => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    try {
        await updateDoc(vehicleRef, { status, updatedAt: serverTimestamp() });
        toast({ title: "Status Updated", description: "Vehicle status changed successfully."});
    } catch(e) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not update vehicle status."});
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
            <TableHead>Nickname</TableHead>
            <TableHead>Vehicle</TableHead>
            <TableHead>Current Driver</TableHead>
            <TableHead>Mileage</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/vehicles/${vehicle.id}`} className="text-primary hover:underline">
                    {vehicle.nickname}
                </Link>
              </TableCell>
              <TableCell>{vehicle.year} {vehicle.make} {vehicle.model}</TableCell>
              <TableCell>{getDriverName(vehicle.currentDriverId)}</TableCell>
              <TableCell>{vehicle.mileage?.toLocaleString()}</TableCell>
              <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full min-w-[150px] justify-between capitalize">
                            <Badge className={getStatusVariant(vehicle.status)}>{vehicle.status}</Badge>
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={vehicle.status} onValueChange={(value) => handleStatusChange(vehicle.id, value as Vehicle['status'])}>
                            <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="maintenance">Maintenance</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="decommissioned">Decommissioned</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>
                {vehicle.updatedAt ? format(vehicle.updatedAt, 'PP') : 'N/A'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
