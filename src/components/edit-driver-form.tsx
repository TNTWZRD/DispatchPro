
"use client";

import React, { useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateDriver } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserPlus, Loader2, Save } from 'lucide-react';
import type { Driver } from '@/lib/types';

const initialState = {
  message: '',
  errors: {
    name: [],
    phoneNumber: [],
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

type EditDriverFormProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    driver: Driver | null;
}

export function EditDriverForm({ isOpen, setIsOpen, driver }: EditDriverFormProps) {
  const [state, formAction] = useActionState(updateDriver, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const defaultValues = useMemo(() => ({
    name: driver?.name ?? '',
    phoneNumber: driver?.phoneNumber ?? '',
  }), [driver]);

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: 'Success',
        description: state.message,
      });
      setIsOpen(false);
    } else if (state.type === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, setIsOpen]);

  if (!driver) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Driver: {driver.name}</DialogTitle>
          <DialogDescription>
            Update the driver's details below.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
          <input type="hidden" name="driverId" value={driver.id} />
          <div className="space-y-2">
            <Label htmlFor="name">Driver Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., John Doe"
              defaultValue={defaultValues.name}
              required
            />
             {state?.errors?.name && (
                <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
           <div className="space-y-2">
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              placeholder="e.g., (555) 123-4567"
              defaultValue={defaultValues.phoneNumber}
              required
            />
             {state?.errors?.phoneNumber && (
                <p className="text-sm font-medium text-destructive">{state.errors.phoneNumber[0]}</p>
            )}
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
