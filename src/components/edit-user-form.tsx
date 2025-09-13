
"use client";

import React, { useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserProfile } from '@/app/settings/actions';
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
import type { AppUser } from '@/lib/types';
import { formatUserName } from '@/lib/utils';

const initialState = {
  message: '',
  errors: {
    displayName: [],
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

type EditUserFormProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: AppUser | null;
}

export function EditUserForm({ isOpen, setIsOpen, user }: EditUserFormProps) {
  const [state, formAction, isPending] = useActionState(updateUserProfile, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const defaultValues = useMemo(() => ({
    displayName: user?.displayName ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  }), [user]);

  useEffect(() => {
    if (state.type === 'success' && !isPending) {
      toast({
        title: 'Success',
        description: state.message,
      });
      setIsOpen(false);
    } else if (state.type === 'error' && state.message && !isPending) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, setIsOpen, isPending]);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User: {formatUserName(user.displayName, user.email)}</DialogTitle>
          <DialogDescription>
            Update the user's details below.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
          <input type="hidden" name="userId" value={user.uid} />
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="e.g., John D."
              defaultValue={defaultValues.displayName}
              required
            />
             {state?.errors?.displayName && (
                <p className="text-sm font-medium text-destructive">{state.errors.displayName[0]}</p>
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
