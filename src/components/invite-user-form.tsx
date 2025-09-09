
"use client";

import React, { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendInviteEmail } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Mail, Loader2, Send } from 'lucide-react';

const initialState = {
  message: '',
  errors: {},
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
      Send Invite
    </Button>
  );
}

export function InviteUserForm() {
  const [state, formAction] = useFormState(sendInviteEmail, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: 'Success',
        description: state.message,
      });
      formRef.current?.reset();
    } else if (state.type === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Mail className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Invite New User</h4>
            <p className="text-sm text-muted-foreground">
              Enter the email address to send an invitation to.
            </p>
          </div>
          <form ref={formRef} action={formAction} className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
            <SubmitButton />
          </form>
        </div>
      </PopoverContent>
    </Popover>
  );
}
