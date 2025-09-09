
"use client";

import React from 'react';
import type { Ride } from '@/lib/types';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, MapPin, Edit } from 'lucide-react';
import { format, set, parse } from 'date-fns';

const formSchema = z.object({
  pickupLocation: z.string().min(3, { message: 'Enter a pickup location.' }),
  dropoffLocation: z.string().optional(),
  stops: z.array(z.object({ name: z.string().min(3, { message: 'Enter a stop location.' }) })).optional(),
  totalFare: z.coerce.number().min(0, { message: 'Fare must be a positive number.'}),
  passengerPhone: z.string().optional(),
  passengerCount: z.coerce.number().optional(),
  scheduledTime: z.string().optional(),
  movingFee: z.boolean().default(false),
  isReturnTrip: z.boolean().default(false),
  isPrepaid: z.boolean().default(false),
  notes: z.string().optional(),
});

type CallLoggerFormValues = z.infer<typeof formSchema>;

type CallLoggerFormProps = {
  rideToEdit?: Ride | null;
  onAddRide: (rideData: Omit<Ride, 'id' | 'status' | 'driverId' | 'requestTime' | 'isNew'>) => void;
  onEditRide: (rideData: Ride) => void;
};

// By splitting the form into its own component, we can use a `key` prop on it.
// When the key changes (e.g., when we switch from editing one ride to another, or to a new ride),
// React will unmount the old component and mount a new one. This forces react-hook-form
// to re-initialize with the correct defaultValues, which is the most reliable way
// to handle dynamic forms with useFieldArray.
export function CallLoggerForm({ onAddRide, onEditRide, rideToEdit }: CallLoggerFormProps) {
  return (
    <CallLoggerFormContent
        key={rideToEdit?.id || 'new'}
        onAddRide={onAddRide}
        onEditRide={onEditRide}
        rideToEdit={rideToEdit}
    />
  )
}

function CallLoggerFormContent({ onAddRide, onEditRide, rideToEdit }: CallLoggerFormProps) {
  const isEditMode = !!rideToEdit;
  
  const form = useForm<CallLoggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickupLocation: rideToEdit?.pickup.name || '',
      dropoffLocation: rideToEdit?.dropoff?.name || '',
      stops: rideToEdit?.stops?.map(s => ({ name: s.name })) || [],
      totalFare: rideToEdit?.totalFare ?? 5,
      passengerPhone: rideToEdit?.passengerPhone || '',
      passengerCount: rideToEdit?.passengerCount ?? 1,
      movingFee: rideToEdit?.movingFee || false,
      isReturnTrip: rideToEdit?.isReturnTrip || false,
      isPrepaid: rideToEdit?.isPrepaid || false,
      notes: rideToEdit?.notes || '',
      scheduledTime: rideToEdit?.scheduledTime ? format(new Date(rideToEdit.scheduledTime), "HH:mm") : '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "stops",
  });

  const handleSelectOnFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.select();
  }

  function onSubmit(values: CallLoggerFormValues) {
    const passengerCount = values.passengerCount || 1;
    const calculatedFare = (values.totalFare || 5) 
      + (values.movingFee ? 10 : 0) 
      + (passengerCount > 1 ? (passengerCount - 1) : 0);

    let scheduledTimeDate: Date | undefined = undefined;
    if (values.scheduledTime) {
      const [hours, minutes] = values.scheduledTime.split(':').map(Number);
      scheduledTimeDate = set(new Date(), { hours, minutes, seconds: 0, milliseconds: 0 });
    }

    const baseRideData = {
      totalFare: calculatedFare,
      passengerPhone: values.passengerPhone,
      passengerCount: passengerCount,
      movingFee: values.movingFee,
      isReturnTrip: values.isReturnTrip,
      isPrepaid: values.isPrepaid,
      notes: values.notes,
      scheduledTime: scheduledTimeDate,
    };
    
    if (isEditMode && rideToEdit) {
      onEditRide({
        ...rideToEdit,
        ...baseRideData,
        pickup: { ...rideToEdit.pickup, name: values.pickupLocation },
        dropoff: values.dropoffLocation ? { ...(rideToEdit.dropoff || { coords: { x: Math.random() * 100, y: Math.random() * 100 } }), name: values.dropoffLocation } : undefined,
        stops: values.stops?.map((stop, i) => {
          const originalStop = rideToEdit.stops?.[i];
          return {
            name: stop.name,
            coords: originalStop?.coords || { x: Math.random() * 100, y: Math.random() * 100 }
          }
        }),
      });
    } else {
      onAddRide({
        ...baseRideData,
        pickup: { name: values.pickupLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } },
        dropoff: values.dropoffLocation ? { name: values.dropoffLocation, coords: { x: Math.random() * 100, y: Math.random() * 100 } } : undefined,
        stops: values.stops?.map(stop => ({ name: stop.name, coords: { x: Math.random() * 100, y: Math.random() * 100 } })),
      });
    }
    form.reset();
  }

  return (
    <div className="max-h-[80vh] overflow-y-auto pr-2">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <Button type="submit" className="w-full">
            {isEditMode ? <Edit className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isEditMode ? 'Update Ride' : 'Log Ride Request'}
            </Button>

            <FormField
            control={form.control}
            name="pickupLocation"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Pickup Location</FormLabel>
                <FormControl>
                    <Input placeholder="123 Main St" {...field} onFocus={handleSelectOnFocus} />
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
                <FormLabel>Dropoff Location (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="456 Oak Ave" {...field} onFocus={handleSelectOnFocus} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            
            <FormField
            control={form.control}
            name="totalFare"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Base Fare</FormLabel>
                <FormControl>
                    <Input type="number" min="0" {...field} onFocus={handleSelectOnFocus} />
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
                        <Input placeholder="e.g., 789 Side Ave" {...field} onFocus={handleSelectOnFocus} />
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
            name="passengerPhone"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Passenger Phone (Optional)</FormLabel>
                <FormControl>
                    <Input placeholder="555-123-4567" {...field} onFocus={handleSelectOnFocus} />
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
                <FormLabel>Passengers (Optional)</FormLabel>
                <FormControl>
                    <Input type="number" min="1" {...field} onFocus={handleSelectOnFocus} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="scheduledTime"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Scheduled Pickup Time (Optional)</FormLabel>
                <FormControl>
                    <Input type="time" {...field} />
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
                    <Textarea placeholder="e.g., Passenger requires assistance, has extra luggage." {...field} onFocus={handleSelectOnFocus} />
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
                        Moving Fee
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
            <FormField
            control={form.control}
            name="isPrepaid"
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
                    Mark as Prepaid
                    </FormLabel>
                    <FormDescription>
                        Indicates the fare has been paid in advance.
                    </FormDescription>
                </div>
                </FormItem>
            )}
            />
            <div className="h-80 sm:h-0" />
        </form>
        </Form>
    </div>
  );
}
