"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  passengerPhone: z.string().min(10, { message: 'Enter a valid phone number.' }),
  pickupLocation: z.string().min(3, { message: 'Enter a pickup location.' }),
  dropoffLocation: z.string().min(3, { message: 'Enter a dropoff location.' }),
  passengerCount: z.coerce.number().min(1, { message: 'Must have at least 1 passenger.' }),
  scheduledTime: z.date().optional(),
  movingFee: z.boolean().default(false),
});

type CallLoggerFormValues = z.infer<typeof formSchema>;

type CallLoggerFormProps = {
  onAddRide: (rideData: {
    passengerPhone: string;
    pickup: { name: string; coords: { x: number; y: number } };
    dropoff: { name: string; coords: { x: number; y: number } };
    passengerCount: number;
    movingFee: boolean;
    scheduledTime?: Date;
  }) => void;
};

export function CallLoggerForm({ onAddRide }: CallLoggerFormProps) {
  const form = useForm<CallLoggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengerPhone: '',
      pickupLocation: '',
      dropoffLocation: '',
      passengerCount: 1,
      movingFee: false,
    },
  });

  function onSubmit(values: CallLoggerFormValues) {
    onAddRide({
      passengerPhone: values.passengerPhone,
      pickup: { name: values.pickupLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
      dropoff: { name: values.dropoffLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
      passengerCount: values.passengerCount,
      movingFee: values.movingFee,
      scheduledTime: values.scheduledTime,
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickupLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup</FormLabel>
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
                    <FormLabel>Dropoff</FormLabel>
                    <FormControl>
                      <Input placeholder="456 Oak Ave" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="passengerCount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Passengers</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="scheduledTime"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Scheduled Pickup (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date()
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="movingFee"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                   <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Moving Fee
                    </FormLabel>
                    <FormDescription>
                      Check if this is a moving-related service.
                    </FormDescription>
                  </div>
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
