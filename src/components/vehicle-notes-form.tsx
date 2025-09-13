
"use client";

import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateVehicleNotes } from '@/app/admin/actions';
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
  errors: {},
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
      Save Notes
    </Button>
  );
}

type VehicleNotesFormProps = {
    vehicle: Vehicle | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function VehicleNotesForm({ vehicle, isOpen, onOpenChange }: VehicleNotesFormProps) {
  const [state, formAction] = useActionState(updateVehicleNotes, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: 'Success',
        description: state.message,
      });
      onOpenChange(false);
    } else if (state.type === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, onOpenChange]);
  
  if (!vehicle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vehicle Notes for {vehicle.nickname}</DialogTitle>
          <DialogDescription>
            Add or edit notes for this vehicle. e.g., maintenance alerts, damage reports.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="vehicleId" value={vehicle.id} />
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={vehicle.notes || ''}
              rows={6}
              placeholder="e.g., Check engine light is on. Reported by driver..."
            />
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
