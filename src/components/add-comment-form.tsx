
"use client";

import React, { useEffect, useRef } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { addTicketComment } from '@/app/admin/actions';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const initialState = { message: "", type: "" };

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Add Comment
        </Button>
    )
}

type AddCommentFormProps = {
    ticketId: string;
    userId: string;
}

export function AddCommentForm({ ticketId, userId }: AddCommentFormProps) {
    const [state, formAction] = useActionState(addTicketComment, initialState);
    const formRef = useRef<HTMLFormElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (state.type === 'success') {
            formRef.current?.reset();
        } else if (state.type === 'error') {
            toast({ variant: 'destructive', title: "Error", description: state.message });
        }
    }, [state, toast]);

    return (
        <form action={formAction} ref={formRef} className="space-y-4">
            <input type="hidden" name="ticketId" value={ticketId} />
            <input type="hidden" name="userId" value={userId} />

            <div className="space-y-2">
                <Label htmlFor="comment">Add a new comment</Label>
                <Textarea id="comment" name="comment" placeholder="Type your comment..." rows={3} />
            </div>

            <div className="flex justify-end">
                <SubmitButton />
            </div>
        </form>
    );
}
