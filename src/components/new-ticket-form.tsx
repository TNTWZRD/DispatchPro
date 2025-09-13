
"use client";

import React, { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTicket } from '@/app/admin/actions';
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
import { Loader2, PlusCircle, Wrench } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';


const initialState = {
  message: '',
  errors: {
    title: [],
    description: [],
    priority: [],
  },
  type: '',
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
      Create Ticket
    </Button>
  );
}

type NewTicketFormProps = {
    vehicleId: string;
    userId: string;
}

export function NewTicketForm({ vehicleId, userId }: NewTicketFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(createTicket, initialState);
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
  }, [state, toast, isPending]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Wrench className="mr-2 h-4 w-4" /> New Maintenance Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Maintenance Ticket</DialogTitle>
          <DialogDescription>
            Report an issue or required maintenance for this vehicle.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="grid gap-4 py-4">
            <input type="hidden" name="vehicleId" value={vehicleId} />
            <input type="hidden" name="reportedById" value={userId} />

            <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" placeholder="e.g., Oil change required" />
                {state.errors?.title && <p className="text-destructive text-sm">{state.errors.title[0]}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" name="description" placeholder="Provide more details about the issue..." />
            </div>

            <div className="space-y-2">
                <Label>Priority</Label>
                 <RadioGroup defaultValue="low" name="priority" className="flex gap-4">
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
