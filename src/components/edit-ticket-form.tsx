
"use client";

import React, { useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateTicket } from '@/app/admin/actions';
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
import type { MaintenanceTicket } from '@/lib/types';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


const initialState = {
  message: '',
  errors: { title: [], description: [], priority: [] },
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

type EditTicketFormProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    ticket: MaintenanceTicket | null;
}

export function EditTicketForm({ isOpen, onOpenChange, ticket }: EditTicketFormProps) {
  const [state, formAction, isPending] = useActionState(updateTicket, initialState);
  const { toast } = useToast();
  const formRef = React.useRef<HTMLFormElement>(null);

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

  if (!ticket) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Ticket: {ticket.title}</DialogTitle>
          <DialogDescription>
            Update the ticket details below.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
            <input type="hidden" name="ticketId" value={ticket.id} />
             <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" defaultValue={ticket.title} />
                {state.errors?.title && <p className="text-destructive text-sm">{state.errors.title[0]}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" name="description" defaultValue={ticket.description} />
            </div>
            <div className="space-y-2">
                <Label>Priority</Label>
                 <RadioGroup defaultValue={ticket.priority} name="priority" className="flex gap-4">
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="low" id="p-low" />
                        <Label htmlFor="p-low">Low</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="medium" id="p-medium" />
                        <Label htmlFor="p-medium">Medium</Label>
                    </div>
                     <div className="flex items-center space-x-2">
                        <RadioGroupItem value="high" id="p-high" />
                        <Label htmlFor="p-high">High</Label>
                    </div>
                 </RadioGroup>
                 {state.errors?.priority && <p className="text-destructive text-sm">{state.errors.priority[0]}</p>}
            </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
