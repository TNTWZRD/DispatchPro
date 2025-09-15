
"use client";

import React, { useEffect, useMemo, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { updateBan } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Save } from 'lucide-react';
import type { Ban } from '@/lib/types';

const initialState = {
  message: '',
  errors: null,
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

type EditBanFormProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    ban: Ban | null;
}

export function EditBanForm({ isOpen, onOpenChange, ban }: EditBanFormProps) {
  const [state, formAction] = useActionState(updateBan, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isOpen) {
      formRef.current?.reset();
    }
  }, [isOpen]);
  
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

  if (!ban) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Ban</DialogTitle>
          <DialogDescription>
            Modify the details for this ban entry.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
          <input type="hidden" name="banId" value={ban.id} />

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="e.g., John Doe" defaultValue={ban.name} />
            {state?.errors?.name && <p className="text-destructive text-sm">{state.errors.name[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" name="phone" placeholder="e.g., 555-867-5309" defaultValue={ban.phone} />
            {state?.errors?.phone && <p className="text-destructive text-sm">{state.errors.phone[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" placeholder="e.g., 123 Bad St, Anytown" defaultValue={ban.address} />
            {state?.errors?.address && <p className="text-destructive text-sm">{state.errors.address[0]}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" name="reason" placeholder="Reason for the ban..." defaultValue={ban.reason} required />
            {state?.errors?.reason && <p className="text-destructive text-sm">{state.errors.reason[0]}</p>}
          </div>
          {state?.message && state.type === 'error' && !state.errors && (
            <p className="text-sm font-medium text-destructive">{state.message}</p>
          )}

          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
