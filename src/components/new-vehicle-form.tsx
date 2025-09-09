
"use client";

import React, { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createVehicle } from '@/app/admin/actions';
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
import { Loader2, PlusCircle } from 'lucide-react';

const initialState = {
  message: '',
  errors: {
    make: [],
    model: [],
    year: [],
    licensePlate: [],
  },
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      Create Vehicle
    </Button>
  );
}

export function NewVehicleForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createVehicle, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

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
          <PlusCircle className="mr-2 h-4 w-4" /> Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
          <DialogDescription>
            Enter the details for a new vehicle in your fleet.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make" name="make" placeholder="e.g., Toyota" />
                    {state.errors?.make && <p className="text-destructive text-sm">{state.errors.make[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model" name="model" placeholder="e.g., Camry" />
                    {state.errors?.model && <p className="text-destructive text-sm">{state.errors.model[0]}</p>}
                </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year" name="year" type="number" placeholder="e.g., 2023" />
                    {state.errors?.year && <p className="text-destructive text-sm">{state.errors.year[0]}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="licensePlate">License Plate</Label>
                    <Input id="licensePlate" name="licensePlate" placeholder="e.g., ABC-123" />
                    {state.errors?.licensePlate && <p className="text-destructive text-sm">{state.errors.licensePlate[0]}</p>}
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
