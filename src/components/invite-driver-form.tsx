
"use client";

import React, { useEffect, useActionState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { inviteDriver } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Send } from 'lucide-react';
import type { Driver } from '@/lib/types';
import { formatUserName } from '@/lib/utils';
import { useAuth } from '@/context/auth-context';

const initialState = {
  message: '',
  errors: { email: [] },
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Send Invite
    </Button>
  );
}

type InviteDriverFormProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    driver: Driver | null;
}

export function InviteDriverForm({ isOpen, setIsOpen, driver }: InviteDriverFormProps) {
  const { user } = useAuth();
  const [state, formAction] = useActionState(inviteDriver, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (state.type === 'success' && !isPending) {
      toast({
        title: 'Success',
        description: state.message,
      });
      formRef.current?.reset();
      setIsOpen(false);
    } else if (state.type === 'error' && state.message && !isPending) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast, setIsOpen, isPending]);

  if (!driver || !user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite Driver: {formatUserName(driver.name)}</DialogTitle>
          <DialogDescription>
            Enter an email address to send a registration invitation to this driver.
          </DialogDescription>
        </DialogHeader>
        <form 
            ref={formRef} 
            action={(formData) => startTransition(() => formAction(formData))}
            className="grid gap-4 py-4"
        >
          <input type="hidden" name="driverName" value={driver.name} />
          <input type="hidden" name="invitedById" value={user.uid} />
          <div className="space-y-2">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
            />
          </div>
          {state?.errors?.email && (
            <p className="text-sm font-medium text-destructive">{state.errors.email[0]}</p>
          )}
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
