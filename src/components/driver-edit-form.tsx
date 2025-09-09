
"use client";

import React, { useMemo } from 'react';
import type { Ride } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';

const formSchema = z.object({
  cashTip: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type DriverEditFormValues = z.infer<typeof formSchema>;

type DriverEditFormProps = {
  ride: Ride;
  onSave: (rideId: string, values: DriverEditFormValues) => void;
};

export function DriverEditForm({ ride, onSave }: DriverEditFormProps) {
  const form = useForm<DriverEditFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cashTip: ride.paymentDetails?.cashTip || undefined,
      notes: ride.notes || '',
    },
  });

  const onSubmit = (values: DriverEditFormValues) => {
    onSave(ride.id, values);
  };

  return (
    <div className="max-h-[80vh] overflow-y-auto p-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="cashTip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cash Tip (Optional)</FormLabel>
                <FormControl>
                  <Input type="number" min="0" step="0.01" placeholder="e.g., 5.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Passenger left a phone in the car." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save Details
          </Button>
          <div className="h-80 sm:h-0" />
        </form>
      </Form>
    </div>
  );
}
