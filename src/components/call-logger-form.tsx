"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Ride } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';

const formSchema = z.object({
  passengerName: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  passengerPhone: z.string().min(10, { message: 'Enter a valid phone number.' }),
  pickupLocation: z.string().min(3, { message: 'Enter a pickup location.' }),
  dropoffLocation: z.string().min(3, { message: 'Enter a dropoff location.' }),
});

type CallLoggerFormValues = z.infer<typeof formSchema>;

type CallLoggerFormProps = {
  onAddRide: (rideData: {
    passengerName: string;
    passengerPhone: string;
    pickup: { name: string; coords: { x: number; y: number } };
    dropoff: { name: string; coords: { x: number; y: number } };
  }) => void;
};

export function CallLoggerForm({ onAddRide }: CallLoggerFormProps) {
  const form = useForm<CallLoggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengerName: '',
      passengerPhone: '',
      pickupLocation: '',
      dropoffLocation: '',
    },
  });

  function onSubmit(values: CallLoggerFormValues) {
    onAddRide({
      passengerName: values.passengerName,
      passengerPhone: values.passengerPhone,
      pickup: { name: values.pickupLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
      dropoff: { name: values.dropoffLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
    });
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log New Call</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="passengerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passenger Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="passengerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passenger Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="555-123-4567" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pickupLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Location</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main St" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="dropoffLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dropoff Location</FormLabel>
                  <FormControl>
                    <Input placeholder="456 Oak Ave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Log Ride Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
