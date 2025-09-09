
"use client";

import React, { useEffect } from 'react';
import type { Ride } from '@/lib/types';
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
import { Plus, Calendar as CalendarIcon, Trash2, MapPin, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  pickupLocation: z.string().min(3, { message: 'Enter a pickup location.' }),
  dropoffLocation: z.string().optional(),
  stops: z.array(z.object({ name: z.string().min(3, { message: 'Enter a stop location.' }) })).optional(),
  totalFare: z.coerce.number().min(0, { message: 'Fare must be a positive number.'}),
  passengerPhone: z.string().optional(),
  passengerCount: z.coerce.number().optional(),
  scheduledTime: z.date().optional(),
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

export function CallLoggerForm({ onAddRide, onEditRide, rideToEdit }: CallLoggerFormProps) {
  const isEditMode = !!rideToEdit;
  
  const form = useForm<CallLoggerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pickupLocation: '',
      dropoffLocation: '',
      stops: [],
      totalFare: 5,
      passengerPhone: '',
      passengerCount: 1,
      movingFee: false,
      isReturnTrip: false,
      isPrepaid: false,
      notes: '',
    },
  });
  
  useEffect(() => {
    if (isEditMode && rideToEdit) {
      const stopsData = rideToEdit.stops?.map(s => ({ name: s.name })) || [];
      form.reset({
        pickupLocation: rideToEdit.pickup.name,
        dropoffLocation: rideToEdit.dropoff?.name || '',
        stops: stopsData,
        totalFare: rideToEdit.totalFare,
        passengerPhone: rideToEdit.passengerPhone || '',
        passengerCount: rideToEdit.passengerCount,
        movingFee: rideToEdit.movingFee,
        isReturnTrip: rideToEdit.isReturnTrip,
        isPrepaid: rideToEdit.isPrepaid,
        notes: rideToEdit.notes,
        scheduledTime: rideToEdit.scheduledTime,
      });
    } else {
      form.reset({
        pickupLocation: '',
        dropoffLocation: '',
        stops: [],
        totalFare: 5,
        passengerPhone: '',
        passengerCount: 1,
        movingFee: false,
        isReturnTrip: false,
        isPrepaid: false,
        notes: '',
        scheduledTime: undefined,
      });
    }
  }, [rideToEdit, isEditMode, form]);


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

    const baseRideData = {
      totalFare: calculatedFare,
      passengerPhone: values.passengerPhone,
      passengerCount: passengerCount,
      movingFee: values.movingFee,
      isReturnTrip: values.isReturnTrip,
      isPrepaid: values.isPrepaid,
      notes: values.notes,
      scheduledTime: values.scheduledTime,
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
    <Card className="flex flex-col border-0 shadow-none max-h-[80vh] overflow-y-auto">
        <CardContent className="p-0">
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
        </CardContent>
    </Card>
  );
}
