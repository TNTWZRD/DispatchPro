
"use server";

import 'dotenv/config';
import { z } from "zod";
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { Role } from '@/lib/types';

const updateUserProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  phoneNumber: z.string().optional(),
});

export async function updateUserProfile(prevState: any, formData: FormData) {
    const formValues = Object.fromEntries(formData.entries());
    const validatedFields = updateUserProfileSchema.safeParse(formValues);

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid details provided.",
        };
    }
    
    try {
        const { userId, displayName, phoneNumber } = validatedFields.data;
        const batch = writeBatch(db);

        // 1. Update the user document
        const userRef = doc(db, 'users', userId);
        const userData: { displayName: string; phoneNumber?: string; updatedAt: any; } = {
            displayName,
            updatedAt: serverTimestamp(),
        };
        if (phoneNumber) {
            userData.phoneNumber = phoneNumber;
        }
        batch.update(userRef, userData);

        // 2. If the user is a driver, update their driver document too
        const driverRef = doc(db, 'drivers', userId);
        const driverData: { name: string; phoneNumber?: string; } = { name: displayName };
        if (phoneNumber) {
            driverData.phoneNumber = phoneNumber;
        }
        batch.update(driverRef, driverData);

        await batch.commit();
        
        revalidatePath('/settings');
        revalidatePath('/');
        revalidatePath('/admin');
        
        return { type: "success", message: "Profile updated successfully." };

    } catch (error: any) {
        // We catch errors, but if the driver doc doesn't exist, it shouldn't fail the whole batch.
        if (error.code === 'not-found') {
             revalidatePath('/settings');
             return { type: "success", message: "Profile updated successfully (user-only)." };
        }
        return { type: "error", message: `Failed to update profile: ${error.message}` };
    }
}
