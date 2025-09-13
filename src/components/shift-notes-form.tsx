
"use client";

import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { updateShiftNotes } from '@/app/admin/actions';
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
import type { Shift } from '@/lib/types';

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

type ShiftNotesFormProps = {
    shift: Shift | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
}

export function ShiftNotesForm({ shift, isOpen, onOpenChange }: ShiftNotesFormProps) {
  const [state, formAction, isPending] = useActionState(updateShiftNotes, initialState);
  const { toast } = useToast();

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
  
  if (!shift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shift Notes</DialogTitle>
          <DialogDescription>
            Add or edit notes for this shift. This is useful for tracking incidents, performance, or other details.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="shiftId" value={shift.id} />
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={shift.notes || ''}
              rows={6}
              placeholder="e.g., Driver was late by 15 mins. Vehicle had a flat tire..."
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
