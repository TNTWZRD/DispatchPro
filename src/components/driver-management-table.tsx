
"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, query, orderBy, Timestamp, updateDoc } from 'firebase/firestore';
import type { Driver } from '@/lib/types';
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
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, MoreHorizontal, User, Trash2, Edit, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deleteDriver } from '@/app/admin/actions';
import { EditDriverForm } from './edit-driver-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const getStatusVariant = (status: Driver['status']) => {
    switch (status) {
        case 'available': return 'bg-green-600 hover:bg-green-700';
        case 'on-ride': return 'bg-blue-500 hover:bg-blue-600';
        case 'offline': return 'bg-gray-500 hover:bg-gray-600';
        default: return 'bg-gray-500';
    }
}

export function DriverManagementTable() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'drivers'), orderBy('name', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const docData = doc.data();
        return {
          ...docData,
          id: doc.id,
          createdAt: docData.createdAt instanceof Timestamp ? docData.createdAt.toDate() : new Date(),
          updatedAt: docData.updatedAt instanceof Timestamp ? docData.updatedAt.toDate() : new Date(),
        } as Driver;
      });
      setDrivers(data);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleEdit = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsEditModalOpen(true);
  };
  
  const handleDelete = async (driverId: string) => {
    const result = await deleteDriver(driverId);
     if (result.type === 'success') {
      toast({ title: 'Success', description: result.message });
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  }
  
  const handleStatusChange = async (driverId: string, status: Driver['status']) => {
    const driverRef = doc(db, 'drivers', driverId);
    try {
        await updateDoc(driverRef, { status });
        toast({ title: "Status Updated", description: "Driver status changed successfully."});
    } catch(e) {
        toast({ variant: 'destructive', title: "Update Failed", description: "Could not update driver status."});
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
    <>
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone Number</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell className="font-medium">{driver.name}</TableCell>
              <TableCell>{driver.phoneNumber}</TableCell>
              <TableCell>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full min-w-[150px] justify-between capitalize">
                            <Badge className={getStatusVariant(driver.status)}>{driver.status.replace('-', ' ')}</Badge>
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuRadioGroup value={driver.status} onValueChange={(value) => handleStatusChange(driver.id, value as Driver['status'])}>
                            <DropdownMenuRadioItem value="available">Available</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="on-ride">On Ride</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="offline">Offline</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
              <TableCell>{driver.rating.toFixed(1)} ★</TableCell>
              <TableCell className="text-right">
                <AlertDialog>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(driver)}>
                          <Edit className="mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                              <Trash2 className="mr-2" /> Delete
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the driver profile for "{driver.name}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(driver.id)}>
                            Continue
                          </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
    
    <EditDriverForm
        isOpen={isEditModalOpen}
        setIsOpen={setIsEditModalOpen}
        driver={selectedDriver}
    />
    </>
  );
}
