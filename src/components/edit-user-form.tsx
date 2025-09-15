
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
import { Loader2, Save, Sprout } from 'lucide-react';
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

function SubmitButton({ isSuperAdminView }: { isSuperAdminView: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending 
        ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
        : isSuperAdminView 
          ? <Sprout className="mr-2 h-4 w-4" />
          : <Save className="mr-2 h-4 w-4" />}
      Save Changes
    </Button>
  );
}

type EditUserFormProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    user: AppUser | null;
    isSuperAdminView?: boolean;
}

export function EditUserForm({ isOpen, setIsOpen, user, isSuperAdminView = false }: EditUserFormProps) {
  const [state, formAction] = useActionState(updateUserProfile, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  const defaultValues = useMemo(() => ({
    displayName: user?.displayName ?? '',
    phoneNumber: user?.phoneNumber ?? '',
  }), [user]);

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
            <SubmitButton isSuperAdminView={isSuperAdminView} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
