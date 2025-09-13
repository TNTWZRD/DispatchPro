
"use client";

import React, { useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateVehicle } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import type { Vehicle } from '@/lib/types';

const initialState = {
  message: '',
  errors: {
    nickname: [],
    make: [],
    model: [],
    year: [],
    vin: [],
    mileage: [],
  },
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      Save Changes
    </Button>
  );
}

type EditVehicleFormProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    vehicle: Vehicle | null;
}

export function EditVehicleForm({ isOpen, onOpenChange, vehicle }: EditVehicleFormProps) {
  const [state, formAction, isPending] = useActionState(updateVehicle, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const defaultValues = useMemo(() => ({
    nickname: vehicle?.nickname ?? '',
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    year: vehicle?.year ?? undefined,
    vin: vehicle?.vin ?? '',
    mileage: vehicle?.mileage ?? undefined,
  }), [vehicle]);

  useEffect(() => {
    if (state.type === 'success' && !isPending) {
      toast({
        title: 'Success',
        description: state.message,
      });
      onOpenChange(false);
    } else if (state.type === 'error' && state.message && !isPending) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, onOpenChange, isPending]);

  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit Vehicle: {vehicle.nickname}</DialogTitle>
          <DialogDescription>
            Update the vehicle's details below.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
            <input type="hidden" name="vehicleId" value={vehicle.id} />
            <div className="space-y-2">
                <Label htmlFor="nickname">Nickname</Label>
                <Input id="nickname" name="nickname" defaultValue={defaultValues.nickname} />
                {state.errors?.nickname && <p className="text-destructive text-sm">{state.errors.nickname[0]}</p>}
            </div>
             <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" name="year" type="number" defaultValue={defaultValues.year} />
                    {state.errors?.year && <p className="text-destructive text-sm">{state.errors.year[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" name="make" defaultValue={defaultValues.make} />
                    {state.errors?.make && <p className="text-destructive text-sm">{state.errors.make[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" defaultValue={defaultValues.model} />
                    {state.errors?.model && <p className="text-destructive text-sm">{state.errors.model[0]}</p>}
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="vin">VIN</Label>
                    <Input id="vin" name="vin" defaultValue={defaultValues.vin} />
                    {state.errors?.vin && <p className="text-destructive text-sm">{state.errors.vin[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input id="mileage" name="mileage" type="number" defaultValue={defaultValues.mileage} />
                    {state.errors?.mileage && <p className="text-destructive text-sm">{state.errors.mileage[0]}</p>}
                </div>
            </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
