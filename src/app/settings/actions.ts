
"use server";

import 'dotenv/config';
import { z } from "zod";
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp, writeBatch, getDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import { Role } from '@/lib/types';

const updateUserProfileSchema = z.object({
  userId: z.string(),
  displayName: z.string().min(2, { message: "Display name must be at least 2 characters." }),
  phoneNumber: z.string().optional(),
  sendAssignmentNotifications: z.enum(['on', 'off']).optional(),
});

export async function updateUserProfile(prevState: any, formData: FormData) {
    const formValues = Object.fromEntries(formData.entries());
    const validatedFields = updateUserProfileSchema.safeParse({
        ...formValues,
        sendAssignmentNotifications: formValues.sendAssignmentNotifications === 'on' ? 'on' : 'off'
    });

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid details provided.",
        };
    }
    
    const { userId, displayName, phoneNumber, sendAssignmentNotifications } = validatedFields.data;
    const batch = writeBatch(db);

    try {
        // 1. Update the user document in 'users' collection
        const userRef = doc(db, 'users', userId);
        const userData: { displayName: string; phoneNumber?: string; updatedAt: any; settings?: any } = {
            displayName,
            updatedAt: serverTimestamp(),
        };
        if (phoneNumber) {
            userData.phoneNumber = phoneNumber;
        }

        userData.settings = {
            sendAssignmentNotifications: sendAssignmentNotifications === 'on',
        }

        batch.update(userRef, userData);

        // 2. Check if the user is a driver and update their 'drivers' document if they are.
        const driverRef = doc(db, 'drivers', userId);
        const driverDoc = await getDoc(driverRef);

        if (driverDoc.exists()) {
            const driverData: { name: string; phoneNumber?: string; } = { name: displayName };
            if (phoneNumber) {
                driverData.phoneNumber = phoneNumber;
            }
            batch.update(driverRef, driverData);
        }

        await batch.commit();
        
        revalidatePath('/settings');
        revalidatePath('/'); // Revalidate main dashboard to reflect name changes
        revalidatePath('/admin'); // Revalidate admin page
        
        return { type: "success", message: "Profile updated successfully." };

    } catch (error: any) {
        console.error("Failed to update profile:", error);
        return { type: "error", message: `Failed to update profile: ${error.message}` };
    }
}
