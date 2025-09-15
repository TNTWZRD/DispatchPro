

"use server";

import 'dotenv/config';
import { z } from "zod";
import { randomBytes } from 'crypto';
import { sendMail } from "@/lib/email";
import { db } from '@/lib/firebase';
import { adminAuth } from '@/lib/firebase-admin';
import { collection, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, addDoc, writeBatch, arrayUnion, getDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import type { Driver, MaintenanceTicket, Vehicle, Shift, AppUser } from '@/lib/types';
import { revalidatePath } from 'next/cache';


// Helper to generate a random code
function generateInviteCode(length = 6) {
    return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length).toUpperCase();
}


const sendInviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  invitedById: z.string(),
});

export async function sendInviteEmail(prevState: any, formData: FormData) {
  const validatedFields = sendInviteSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      type: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid data provided.",
    };
  }
  
  const { email, invitedById } = validatedFields.data;
  const inviteCode = generateInviteCode();
  const registrationUrl = `http://localhost:9002/register?code=${inviteCode}`;

  try {
    // Store invite in Firestore
    await addDoc(collection(db, 'invites'), {
      code: inviteCode,
      email: email,
      invitedById: invitedById,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), // Expires in 48 hours
    });

    await sendMail({
        to: email,
        subject: "You're invited to join DispatchPro",
        html: `
            <h1>Invitation to DispatchPro</h1>
            <p>You have been invited to join the DispatchPro platform.</p>
            <p>Please register by clicking the link below:</p>
            <a href="${registrationUrl}" target="_blank">${registrationUrl}</a>
            <p>If the link doesn't work, go to the registration page and enter this code:</p>
            <h2>${inviteCode}</h2>
            <p>This code will expire in 48 hours.</p>
            <p>Thanks,</p>
            <p>The DispatchPro Team</p>
        `,
    });
    revalidatePath('/admin');
    return { type: "success", message: `Invitation sent to successfully to ${email}.` };
  } catch (error) {
    console.error("Failed to send email:", error);
    return { type: "error", message: "Failed to send the invitation email. Please try again later." };
  }
}

const inviteDriverSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  driverName: z.string(),
  invitedById: z.string(),
});

export async function inviteDriver(prevState: any, formData: FormData) {
  const validatedFields = inviteDriverSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validatedFields.success) {
    return {
      type: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid data provided.",
    };
  }
  
  const { email, driverName, invitedById } = validatedFields.data;
  const inviteCode = generateInviteCode();
  const registrationUrl = `http://localhost:9002/register?code=${inviteCode}`;

  try {
     // Store invite in Firestore
    await addDoc(collection(db, 'invites'), {
      code: inviteCode,
      email: email,
      invitedById: invitedById,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + 48 * 60 * 60 * 1000), // Expires in 48 hours
    });

    await sendMail({
        to: email,
        subject: `You're invited to join DispatchPro, ${driverName}!`,
        html: `
            <h1>Invitation to DispatchPro</h1>
            <p>Hi ${driverName},</p>
            <p>You have been invited to join the DispatchPro platform as a driver.</p>
            <p>Please register by clicking the link below:</p>
            <a href="${registrationUrl}" target="_blank">${registrationUrl}</a>
            <p>If the link doesn't work, go to the registration page and enter this code:</p>
            <h2>${inviteCode}</h2>
            <p>Once you register with this email address, your account will be linked to your existing driver profile.</p>
            <p>This code will expire in 48 hours.</p>
            <p>Thanks,</p>
            <p>The DispatchPro Team</p>
        `,
    });
    revalidatePath('/admin');
    return { type: "success", message: `Invitation sent successfully to ${email}.` };
  } catch (error: any) {
    console.error("Failed to send driver invitation email:", error);
    return { type: "error", message: "Failed to send the invitation email. Please try again later." };
  }
}


const createDriverSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
});

export async function createDriver(prevState: any, formData: FormData) {
    const formValues = Object.fromEntries(formData.entries());
    const validatedFields = createDriverSchema.safeParse(formValues);

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid driver details provided.",
        };
    }

    try {
        const { name, phoneNumber } = validatedFields.data;
        
        // Check if an AppUser with this phone number already exists
        const userQuery = query(collection(db, 'users'), where('phoneNumber', '==', phoneNumber));
        const userSnapshot = await getDocs(userQuery);
        if (!userSnapshot.empty) {
            const existingUser = userSnapshot.docs[0].data() as AppUser;
            return {
                type: 'error',
                message: `An existing user (${existingUser.email}) is already associated with this phone number. Please use a different number or invite the existing user as a driver.`
            };
        }

        const newDriverRef = doc(collection(db, 'drivers'));

        const newDriver: Driver = {
            id: newDriverRef.id,
            name,
            phoneNumber,
            rating: 5,
            status: 'offline',
            location: { x: Math.random() * 100, y: Math.random() * 100 },
        };

        await setDoc(newDriverRef, {
            ...newDriver,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        revalidatePath('/admin');
        
        return { type: "success", message: `Driver "${name}" created successfully.` };
    } catch (error: any) {
        console.error("Failed to create driver in Firestore:", error);
        return { type: "error", message: `Failed to create driver: ${error.message}` };
    }
}

const updateDriverSchema = z.object({
    driverId: z.string(),
    name: z.string().min(2, { message: "Name must be at least 2 characters." }),
    phoneNumber: z.string().min(10, { message: "Phone number must be at least 10 digits." }),
});

export async function updateDriver(prevState: any, formData: FormData) {
    const formValues = Object.fromEntries(formData.entries());
    const validatedFields = updateDriverSchema.safeParse(formValues);

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid driver details provided.",
        };
    }
    
    const batch = writeBatch(db);
    
    try {
        const { driverId, name, phoneNumber } = validatedFields.data;
        const driverRef = doc(db, 'drivers', driverId);

        batch.update(driverRef, {
            name,
            phoneNumber,
            updatedAt: serverTimestamp(),
        });

        // Also update the user's main profile if they are a user
        const userRef = doc(db, 'users', driverId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            batch.update(userRef, {
                displayName: name,
                phoneNumber: phoneNumber,
                updatedAt: serverTimestamp()
            });
        }
        
        await batch.commit();
        revalidatePath('/admin');
        revalidatePath('/settings'); // In case the user themselves is being edited

        return { type: "success", message: "Driver updated successfully." };

    } catch (error: any) {
        return { type: "error", message: `Failed to update driver: ${error.message}` };
    }
}

export async function deleteDriver(driverId: string) {
    try {
        const driverRef = doc(db, 'drivers', driverId);
        await deleteDoc(driverRef);
        revalidatePath('/admin');
        return { type: "success", message: "Driver deleted successfully." };
    } catch (error: any) {
        return { type: "error", message: `Failed to delete driver: ${error.message}` };
    }
}


const createVehicleSchema = z.object({
  nickname: z.string().min(2, { message: "Nickname must be at least 2 characters." }),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  vin: z.string().optional(),
  mileage: z.coerce.number().optional(),
});


export async function createVehicle(prevState: any, formData: FormData) {
    const validatedFields = createVehicleSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid vehicle details provided.",
        };
    }

    try {
        const { nickname, make, model, year, vin, mileage } = validatedFields.data;

        const newVehicleRef = doc(collection(db, 'vehicles'));

        const newVehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
            nickname,
            make: make || '',
            model: model || '',
            year: year || null,
            vin: vin || '',
            mileage: mileage || null,
            status: 'active',
            currentShiftId: null,
        };
        
        await setDoc(newVehicleRef, {
            id: newVehicleRef.id,
            ...newVehicle,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        
        revalidatePath('/admin/vehicles');
        return { type: "success", message: `Vehicle "${nickname}" created successfully.` };
    } catch (error) {
        console.error("Failed to create vehicle:", error);
        return { type: "error", message: "Failed to create the vehicle. Please try again later." };
    }
}

const updateVehicleSchema = z.object({
  vehicleId: z.string(),
  nickname: z.string().min(2, { message: "Nickname must be at least 2 characters." }),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.coerce.number().optional(),
  vin: z.string().optional(),
  mileage: z.coerce.number().optional(),
});

export async function updateVehicle(prevState: any, formData: FormData) {
    const validatedFields = updateVehicleSchema.safeParse(
        Object.fromEntries(formData.entries())
    );

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid vehicle details provided.",
        };
    }

    try {
        const { vehicleId, ...updateData } = validatedFields.data;
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        await updateDoc(vehicleRef, { ...updateData, updatedAt: serverTimestamp() });
        
        revalidatePath(`/admin/vehicles/${vehicleId}`);
        revalidatePath('/admin/vehicles');
        return { type: "success", message: "Vehicle updated successfully." };

    } catch (error: any) {
        console.error("Failed to update vehicle:", error);
        return { type: "error", message: `Failed to update vehicle: ${error.message}` };
    }
}

const createTicketSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
  vehicleId: z.string(),
  reportedById: z.string(),
});

export async function createTicket(prevState: any, formData: FormData) {
  const validatedFields = createTicketSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      type: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid ticket details provided.",
    };
  }

  try {
    const { vehicleId, title, description, priority, reportedById } = validatedFields.data;
    
    const newTicket: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'updatedAt' | 'activity'> = {
      vehicleId,
      title,
      description: description || '',
      priority,
      status: 'open',
      reportedById,
    };
    
    const ticketRef = await addDoc(collection(db, 'tickets'), {
      ...newTicket,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    
    const activityRef = collection(db, 'tickets', ticketRef.id, 'activity');
    await addDoc(activityRef, {
        userId: reportedById,
        timestamp: serverTimestamp(),
        type: 'status_change',
        content: `Ticket created and set to "open".`,
    })

    revalidatePath(`/admin/vehicles/${vehicleId}`);
    revalidatePath(`/admin/maintenance`);
    return { type: 'success', message: 'Maintenance ticket created successfully.' };

  } catch (error: any) {
    console.error("Failed to create ticket:", error);
    return { type: "error", message: `Failed to create ticket: ${error.message}` };
  }
}


const updateTicketSchema = z.object({
  ticketId: z.string(),
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
});

export async function updateTicket(prevState: any, formData: FormData) {
    const validatedFields = updateTicketSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { type: "error", message: "Invalid data.", errors: validatedFields.error.flatten().fieldErrors };
    }
    try {
        const { ticketId, ...updateData } = validatedFields.data;
        await updateDoc(doc(db, 'tickets', ticketId), {
            ...updateData,
            updatedAt: serverTimestamp(),
        });
        revalidatePath(`/admin/maintenance/${ticketId}`);
        return { type: "success", message: "Ticket updated successfully." };
    } catch (e: any) {
        return { type: "error", message: `Failed to update ticket: ${e.message}` };
    }
}

const addCommentSchema = z.object({
    ticketId: z.string(),
    userId: z.string(),
    comment: z.string().min(1, "Comment cannot be empty."),
});

export async function addTicketComment(prevState: any, formData: FormData) {
    const validatedFields = addCommentSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!validatedFields.success) {
        return { type: "error", message: "Invalid comment." };
    }
    try {
        const { ticketId, userId, comment } = validatedFields.data;
        const activityRef = collection(db, 'tickets', ticketId, 'activity');
        await addDoc(activityRef, {
            userId,
            timestamp: serverTimestamp(),
            type: 'comment',
            content: comment,
        });
        revalidatePath(`/admin/maintenance/${ticketId}`);
        return { type: "success", message: "Comment added." };
    } catch (e: any) {
        return { type: "error", message: `Failed to add comment: ${e.message}` };
    }
}

const startShiftSchema = z.object({
  driverId: z.string().min(1, "Please select a driver."),
  vehicleId: z.string().min(1, "Please select a vehicle."),
});

export async function startShift(prevState: any, formData: FormData) {
  const validatedFields = startShiftSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      type: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Please select a driver and a vehicle.",
    };
  }

  const { driverId, vehicleId } = validatedFields.data;
  
  const batch = writeBatch(db);

  try {
    // 1. Create a new shift document
    const newShiftRef = doc(collection(db, 'shifts'));
    const newShift: Omit<Shift, 'id'> = {
        driverId,
        vehicleId,
        status: 'active',
        startTime: serverTimestamp() as any,
    };
    batch.set(newShiftRef, newShift);

    // 2. Update driver status and link to shift
    const driverRef = doc(db, 'drivers', driverId);
    batch.update(driverRef, { status: 'on-shift', currentShiftId: newShiftRef.id });

    // 3. Update vehicle and link to shift
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    batch.update(vehicleRef, { currentShiftId: newShiftRef.id });

    await batch.commit();
    revalidatePath('/admin/shifts');
    revalidatePath('/');
    return { type: "success", message: `Shift started successfully.` };

  } catch(error: any) {
    console.error("Failed to start shift:", error);
    return { type: "error", message: `Failed to start shift: ${error.message}` };
  }
}

const updateShiftSchema = z.object({
  shiftId: z.string(),
  vehicleId: z.string().min(1, "Please select a vehicle."),
});

export async function updateShift(prevState: any, formData: FormData) {
  const validatedFields = updateShiftSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      type: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid data.",
    };
  }
  
  const { shiftId, vehicleId: newVehicleId } = validatedFields.data;
  
  const batch = writeBatch(db);
  const shiftRef = doc(db, 'shifts', shiftId);

  try {
    const shiftDoc = await getDoc(shiftRef);
    if (!shiftDoc.exists()) {
      return { type: "error", message: "Shift not found." };
    }

    const oldVehicleId = shiftDoc.data().vehicleId;
    
    if (oldVehicleId === newVehicleId) {
       return { type: "success", message: "No changes made." };
    }

    // 1. Update the shift document
    batch.update(shiftRef, { vehicleId: newVehicleId });

    // 2. Update the new vehicle
    const newVehicleRef = doc(db, 'vehicles', newVehicleId);
    batch.update(newVehicleRef, { currentShiftId: shiftId });

    // 3. Update the old vehicle
    const oldVehicleRef = doc(db, 'vehicles', oldVehicleId);
    batch.update(oldVehicleRef, { currentShiftId: null });

    await batch.commit();
    revalidatePath('/admin/shifts');
    revalidatePath('/');
    return { type: "success", message: "Shift updated successfully." };

  } catch(error: any) {
    console.error("Failed to update shift:", error);
    return { type: "error", message: `Failed to update shift: ${error.message}` };
  }
}

export async function endShift(shiftId: string, driverId: string, vehicleId: string) {
    const batch = writeBatch(db);
    try {
        // 1. Update the shift document
        const shiftRef = doc(db, 'shifts', shiftId);
        batch.update(shiftRef, { status: 'inactive', endTime: serverTimestamp() });

        // 2. Update the driver status
        const driverRef = doc(db, 'drivers', driverId);
        batch.update(driverRef, { status: 'available', currentShiftId: null });

        // 3. Update the vehicle
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        batch.update(vehicleRef, { currentShiftId: null });

        await batch.commit();
        revalidatePath('/admin/shifts');
        revalidatePath('/');
        return { type: "success", message: "Shift ended successfully." };
    } catch (error: any) {
        console.error("Failed to end shift:", error);
        return { type: "error", message: `Failed to end shift: ${error.message}` };
    }
}

const notesSchema = z.object({
  notes: z.string().optional(),
});

export async function updateShiftNotes(prevState: any, formData: FormData) {
  const shiftId = formData.get('shiftId') as string;
  const validatedFields = notesSchema.safeParse({
    notes: formData.get("notes"),
  });

  if (!shiftId || !validatedFields.success) {
    return { type: "error", message: "Invalid data provided." };
  }

  try {
    const shiftRef = doc(db, 'shifts', shiftId);
    await updateDoc(shiftRef, {
      notes: validatedFields.data.notes,
    });
    revalidatePath('/admin/shifts');
    revalidatePath('/');
    return { type: "success", message: "Shift notes updated successfully." };
  } catch (error: any) {
    console.error("Failed to update shift notes:", error);
    return { type: "error", message: `Failed to update shift notes: ${error.message}` };
  }
}

export async function updateVehicleNotes(prevState: any, formData: FormData) {
  const vehicleId = formData.get('vehicleId') as string;
  const validatedFields = notesSchema.safeParse({
    notes: formData.get("notes"),
  });

  if (!vehicleId || !validatedFields.success) {
    return { type: "error", message: "Invalid data provided." };
  }

  try {
    const vehicleRef = doc(db, 'vehicles', vehicleId);
    await updateDoc(vehicleRef, {
      notes: validatedFields.data.notes,
      updatedAt: serverTimestamp(),
    });
    revalidatePath(`/admin/vehicles/${vehicleId}`);
    revalidatePath('/');
    return { type: "success", message: "Vehicle notes updated successfully." };
  } catch (error: any) {
    console.error("Failed to update vehicle notes:", error);
    return { type: "error", message: `Failed to update vehicle notes: ${error.message}` };
  }
}

export async function resetPassword(email: string) {
    if (!adminAuth) {
        return { type: "error", message: "Auth service not available." };
    }
    try {
        await adminAuth.generatePasswordResetLink(email);
        return { type: "success", message: `Password reset email sent to ${email}.` };
    } catch (error: any) {
        console.error("Failed to send password reset email:", error);
        return { type: "error", message: `Failed to send password reset: ${error.message}` };
    }
}

export async function disableUser(userId: string) {
    if (!adminAuth) {
        return { type: "error", message: "Auth service not available." };
    }
    const batch = writeBatch(db);
    try {
        await adminAuth.updateUser(userId, { disabled: true });
        
        const userRef = doc(db, 'users', userId);
        batch.update(userRef, { disabled: true });

        const driverRef = doc(db, 'drivers', userId);
        const driverDoc = await getDoc(driverRef);
        if (driverDoc.exists()) {
            batch.update(driverRef, { status: 'offline' });
        }
        
        await batch.commit();
        revalidatePath('/admin');
        return { type: "success", message: "User has been disabled." };
    } catch (error: any) {
        console.error("Failed to disable user:", error);
        return { type: "error", message: `Failed to disable user: ${error.message}` };
    }
}
