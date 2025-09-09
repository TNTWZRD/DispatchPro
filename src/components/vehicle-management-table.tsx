
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, Timestamp, query, orderBy } from 'firebase/firestore';
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
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


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
          createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : new Date(),
          updatedAt: docData.updatedAt instanceof Timestamp ? docData.updatedAt.toDate() : new Date(),
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

  const handleStatusChange = async (vehicleId: string, status: Vehicle['status']) => {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    try {
        await updateDoc(vehicleRef, { status, updatedAt: serverTimestamp() });
        toast({ title: "Status Updated", description: "Vehicle status changed successfully."});
    } catch(e) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not update vehicle status."});
    }
  }

  const handleDriverAssignment = async (vehicleId: string, driverId: string) => {
     const vehicleRef = doc(db, 'vehicles', vehicleId);
     const newDriverId = driverId === 'unassigned' ? null : driverId;
    try {
        await updateDoc(vehicleRef, { currentDriverId: newDriverId, updatedAt: serverTimestamp() });
        toast({ title: "Driver Assigned", description: "Vehicle has been assigned to the new driver."});
    } catch(e) {
        console.error("Assignment failed: ", e)
        toast({ variant: 'destructive', title: "Assignment Failed", description: "Could not assign driver."});
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
            <TableHead>Vehicle</TableHead>
            <TableHead>License Plate</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Current Driver</TableHead>
            <TableHead>Last Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vehicles.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell>
                <div className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</div>
              </TableCell>
              <TableCell>{vehicle.licensePlate}</TableCell>
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
                 <Select
                    value={vehicle.currentDriverId ?? 'unassigned'}
                    onValueChange={(value) => handleDriverAssignment(vehicle.id, value)}
                 >
                    <SelectTrigger className="w-full min-w-[180px]">
                        <SelectValue placeholder="Assign driver..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                         <DropdownMenuSeparator />
                        {drivers.map(driver => (
                            <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                        ))}
                    </SelectContent>
                 </Select>
              </TableCell>
              <TableCell>
                {format(vehicle.updatedAt, 'PP')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
