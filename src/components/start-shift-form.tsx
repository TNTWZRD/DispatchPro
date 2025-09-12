
"use client";

import React, { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { startShift } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, PlusCircle, Briefcase } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import type { Driver, Vehicle } from '@/lib/types';


const initialState = {
  message: '',
  errors: {
    driverId: [],
    vehicleId: [],
  },
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Briefcase className="mr-2 h-4 w-4" />}
      Start Shift
    </Button>
  );
}

export function StartShiftForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(startShift, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  
  const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    const driversQuery = query(collection(db, 'drivers'), where('status', '==', 'available'));
    const unsubDrivers = onSnapshot(driversQuery, snapshot => {
        setAvailableDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Driver)));
    });

    const vehiclesQuery = query(collection(db, 'vehicles'), where('status', '==', 'active'), where('currentShiftId', '==', null));
    const unsubVehicles = onSnapshot(vehiclesQuery, snapshot => {
        setAvailableVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });

    return () => {
        unsubDrivers();
        unsubVehicles();
    };
  }, []);

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: 'Success',
        description: state.message,
      });
      formRef.current?.reset();
      setIsOpen(false);
    } else if (state.type === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Start New Shift
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Shift</DialogTitle>
          <DialogDescription>
            Assign an available driver to an available vehicle to start a shift.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="driverId">Driver</Label>
                <Select name="driverId">
                    <SelectTrigger>
                        <SelectValue placeholder="Select an available driver" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableDrivers.length > 0 ? (
                            availableDrivers.map(driver => (
                                <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="none" disabled>No drivers available</SelectItem>
                        )}
                    </SelectContent>
                </Select>
                {state.errors?.driverId && <p className="text-destructive text-sm">{state.errors.driverId[0]}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="vehicleId">Vehicle</Label>
                <Select name="vehicleId">
                    <SelectTrigger>
                        <SelectValue placeholder="Select an available vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableVehicles.length > 0 ? (
                            availableVehicles.map(vehicle => (
                                <SelectItem key={vehicle.id} value={vehicle.id}>
                                    {vehicle.nickname} ({vehicle.year} {vehicle.make} {vehicle.model})
                                </SelectItem>
                            ))
                        ) : (
                             <SelectItem value="none" disabled>No vehicles available</SelectItem>
                        )}
                    </SelectContent>
                </Select>
                 {state.errors?.vehicleId && <p className="text-destructive text-sm">{state.errors.vehicleId[0]}</p>}
            </div>

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
