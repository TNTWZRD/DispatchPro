
"use client";

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar as CalendarIcon, Trash2, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  passengerPhone: z.string().min(10, { message: 'Enter a valid phone number.' }),
  pickupLocation: z.string().min(3, { message: 'Enter a pickup location.' }),
  dropoffLocation: z.string().min(3, { message: 'Enter a dropoff location.' }),
  stops: z.array(z.object({ name: z.string().min(3, { message: 'Enter a stop location.' }) })).optional(),
  passengerCount: z.coerce.number().min(1, { message: 'Must have at least 1 passenger.' }),
  scheduledTime: z.date().optional(),
  movingFee: z.boolean().default(false),
  isReturnTrip: z.boolean().default(false),
  notes: z.string().optional(),
});

type CallLoggerFormValues = z.infer<typeof formSchema>;

type CallLoggerFormProps = {
  onAddRide: (rideData: {
    passengerPhone: string;
    pickup: { name: string; coords: { x: number; y: number } };
    dropoff: { name: string; coords: { x: number; y: number } };
    stops?: { name: string; coords: { x: number; y: number } }[];
    passengerCount: number;
    movingFee: boolean;
    isReturnTrip: boolean;
    notes?: string;
    scheduledTime?: Date;
    totalFare: number;
  }) => void;
};

export function CallLoggerForm({ onAddRide }: CallLoggerFormProps) {
  const form = useForm<CallLoggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      passengerPhone: '',
      pickupLocation: '',
      dropoffLocation: '',
      stops: [],
      passengerCount: 1,
      movingFee: false,
      isReturnTrip: false,
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  function onSubmit(values: CallLoggerFormValues) {
    const pickupCoords = { x: Math.random() * 100, y: Math.random() * 100 };
    const dropoffCoords = { x: Math.random() * 100, y: Math.random() * 100 };

    // Simulate distance-based fare
    const distance = Math.sqrt(Math.pow(dropoffCoords.x - pickupCoords.x, 2) + Math.pow(dropoffCoords.y - pickupCoords.y, 2));
    let calculatedFare = 10 + distance * 0.2; // Base fare + per "mile" charge

    if (values.movingFee) {
      calculatedFare += 10;
    }
    if (values.passengerCount > 1) {
      calculatedFare += (values.passengerCount - 1);
    }
    
    onAddRide({
      passengerPhone: values.passengerPhone,
      pickup: { name: values.pickupLocation, coords: pickupCoords },
      dropoff: { name: values.dropoffLocation, coords: dropoffCoords },
      stops: values.stops?.map(stop => ({ name: stop.name, coords: { x: Math.random() * 100, y: Math.random() * 100 } })),
      passengerCount: values.passengerCount,
      movingFee: values.movingFee,
      isReturnTrip: values.isReturnTrip,
      notes: values.notes,
      scheduledTime: values.scheduledTime,
      totalFare: Math.round(calculatedFare * 100) / 100, // Round to 2 decimal places
    });
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log New Call</CardTitle>
      </CardHeader>
      <CardContent className="max-h-[70vh] overflow-y-auto pr-4">
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
            
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`stops.${index}.name`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stop {index + 1}</FormLabel>
                     <div className="flex items-center gap-2">
                        <FormControl>
                          <Input placeholder="e.g., 789 Side Ave" {...field} />
                        </FormControl>
                        <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                            <Trash2 />
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
             <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: "" })}
            >
                <MapPin className="mr-2"/> Add Stop
            </Button>


            <FormField
              control={form.control}
              name="dropoffLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Final Dropoff Location</FormLabel>
                  <FormControl>
                    <Input placeholder="456 Oak Ave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
           
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
                            format(field.value, "PPP p")
                          ) : (
                            <span>Pick a date and time</span>
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
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Passenger requires assistance, has extra luggage." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
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
                        Moving Fee (+$10)
                        </FormLabel>
                    </div>
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="isReturnTrip"
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
                        Return Trip
                        </FormLabel>
                    </div>
                    </FormItem>
                )}
                />
            </div>
            
            <Button type="submit" className="w-full">
              <Plus className="mr-2 h-4 w-4" /> Log Ride Request
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
