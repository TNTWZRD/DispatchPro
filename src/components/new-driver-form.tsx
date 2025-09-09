
"use client";

import React, { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDriver } from '@/app/admin/actions';
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
import { UserPlus, Loader2, PlusCircle } from 'lucide-react';

const initialState = {
  message: '',
  errors: {},
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
      Create Driver
    </Button>
  );
}

export function NewDriverForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction] = useActionState(createDriver, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.type === 'success') {
      toast({
        title: 'Success',
        description: state.message,
      });
      formRef.current?.reset();
      setIsOpen(false);
    } else if (state.type === 'error' && state.message) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.message,
      });
    }
  }, [state, toast]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Driver
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Driver</DialogTitle>
          <DialogDescription>
            Create a profile for a driver who does not have a user account.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Driver Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g., John Doe"
              required
            />
             {state?.errors?.name && (
                <p className="text-sm font-medium text-destructive">{state.errors.name[0]}</p>
            )}
          </div>
           <div className="space-y-2">
            <Label htmlFor="vehicle">Vehicle Description</Label>
            <Input
              id="vehicle"
              name="vehicle"
              type="text"
              placeholder="e.g., Toyota Camry"
              required
            />
             {state?.errors?.vehicle && (
                <p className="text-sm font-medium text-destructive">{state.errors.vehicle[0]}</p>
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
