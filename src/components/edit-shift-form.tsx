
"use client";

import React, { useEffect, useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { updateShift } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Save, Briefcase } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, or } from 'firebase/firestore';
import type { Shift, Vehicle, Driver } from '@/lib/types';
import { formatUserName } from '@/lib/utils';

const initialState = {
  message: '',
  errors: { vehicleId: [] },
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      Save Changes
    </Button>
  );
}

type EditShiftFormProps = {
    shift: Shift | null;
    driver?: Driver;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function EditShiftForm({ shift, driver, isOpen, onOpenChange }: EditShiftFormProps) {
  const [state, formAction] = useActionState(updateShift, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  
  const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);

  useEffect(() => {
    if (!shift) return;
    const vehiclesQuery = query(
        collection(db, 'vehicles'), 
        where('status', '==', 'active'),
        or(
          where('currentShiftId', '==', null),
          where('currentShiftId', '==', shift.id)
        )
    );
    const unsubVehicles = onSnapshot(vehiclesQuery, snapshot => {
        setAvailableVehicles(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle)));
    });

    return () => {
        unsubVehicles();
    };
  }, [shift]);

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: 'Success',
        description: state.message,
      });
      formRef.current?.reset();
      onOpenChange(false);
    } else if (state.type === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, onOpenChange]);

  if (!shift || !driver) return null;

  return (
     <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase />
            Edit Shift
          </DialogTitle>
          <DialogDescription>
            Modify the vehicle for {formatUserName(driver.name)}'s current shift.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
            <input type="hidden" name="shiftId" value={shift.id} />
            <div className="space-y-2">
                <Label>Driver</Label>
                <Input value={formatUserName(driver.name)} disabled />
            </div>

            <div className="space-y-2">
                <Label htmlFor="vehicleId">Vehicle</Label>
                <Select name="vehicleId" defaultValue={shift.vehicleId}>
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
