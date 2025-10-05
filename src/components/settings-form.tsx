

"use client";

import React, { useEffect } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUserProfile } from '@/app/settings/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import type { AppUser } from '@/lib/types';
import { Switch } from './ui/switch';

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

type SettingsFormProps = {
    user: AppUser;
}

export function SettingsForm({ user }: SettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateUserProfile, initialState);
  const { toast } = useToast();

  useEffect(() => {
    if (state.type === 'success' && !isPending) {
      toast({
        title: 'Success',
        description: state.message,
      });
    } else if (state.type === 'error' && state.message && !isPending) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, isPending]);

  return (
    <form action={formAction} className="grid gap-6">
        <input type="hidden" name="userId" value={user.uid} />
        <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              name="displayName"
              type="text"
              placeholder="e.g., John D."
              defaultValue={user.displayName ?? ''}
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
              defaultValue={user.phoneNumber ?? ''}
            />
             {state?.errors?.phoneNumber && (
                <p className="text-sm font-medium text-destructive">{state.errors.phoneNumber[0]}</p>
            )}
          </div>

          <div className="flex justify-end">
            <SubmitButton />
          </div>
    </form>
  );
}
