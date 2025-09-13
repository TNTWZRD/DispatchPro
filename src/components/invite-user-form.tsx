
"use client";

import React, { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sendInviteEmail } from '@/app/admin/actions';
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
import { Mail, Loader2, Send } from 'lucide-react';

const initialState = {
  message: '',
  errors: {},
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

export function InviteUserForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(sendInviteEmail, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

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
  }, [state, isPending, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Mail className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
          <DialogDescription>
            Enter the email address to send an invitation to. They will receive a link to register.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
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
