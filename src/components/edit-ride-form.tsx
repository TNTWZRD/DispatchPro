
"use client";

import React, { useEffect } from 'react';
import type { Ride } from '@/lib/types';
import { CallLoggerForm } from './call-logger-form';
import { updateRide } from '@/app/admin/actions';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveDialog } from './responsive-dialog';

type EditRideFormProps = {
    ride: Ride | null;
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
};

export function EditRideForm({ ride, isOpen, onOpenChange }: EditRideFormProps) {
    const { toast } = useToast();

    const handleEditRide = async (updatedRide: Ride) => {
        const result = await updateRide(updatedRide.id, updatedRide);
        if (result.type === 'success') {
            toast({ title: 'Success', description: 'Ride updated successfully.' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: result.message });
        }
        onOpenChange(false);
    };

    if (!ride) return null;

    return (
        <ResponsiveDialog open={isOpen} onOpenChange={onOpenChange} title="Edit Ride Details">
            <CallLoggerForm
                key={ride.id}
                rideToEdit={ride}
                onAddRide={() => {}} // Not used in edit mode
                onEditRide={handleEditRide}
            />
        </ResponsiveDialog>
    );
}
