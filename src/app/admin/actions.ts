
"use server";

import 'dotenv/config';
import { z } from "zod";
import { sendMail } from "@/lib/email";
import { db } from '@/lib/firebase';
import { collection, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, addDoc } from 'firebase/firestore';
import type { Driver, MaintenanceTicket, Vehicle } from '@/lib/types';
import { revalidatePath } from 'next/cache';

const INVITE_CODE = 'KBT04330';

const sendInviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
});

export async function sendInviteEmail(prevState: any, formData: FormData) {
  const validatedFields = sendInviteSchema.safeParse({
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return {
      type: "error",
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Invalid email address provided.",
    };
  }
  
  const { email } = validatedFields.data;
  const registrationUrl = `http://localhost:9002/register`;

  try {
    await sendMail({
        to: email,
        subject: "You're invited to join DispatchPro",
        html: `
            <h1>Invitation to DispatchPro</h1>
            <p>You have been invited to join the DispatchPro platform.</p>
            <p>Please register by clicking the link below:</p>
            <a href="${registrationUrl}" target="_blank">${registrationUrl}</a>
            <p>During registration, please use the following invite code:</p>
            <h2>${INVITE_CODE}</h2>
            <p>Thanks,</p>
            <p>The DispatchPro Team</p>
        `,
    });
    return { type: "success", message: `Invitation sent to successfully to ${email}.` };
  } catch (error) {
    console.error("Failed to send email:", error);
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
        const newDriverRef = doc(collection(db, 'drivers'));

        const newDriver: Omit<Driver, 'id'> = {
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
    
    try {
        const { driverId, name, phoneNumber } = validatedFields.data;
        const driverRef = doc(db, 'drivers', driverId);

        await updateDoc(driverRef, {
            name,
            phoneNumber,
            updatedAt: serverTimestamp(),
        });
        
        revalidatePath('/admin');

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
    } catch (error: any) => {
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
            currentDriverId: null,
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
    
    const newTicket: Omit<MaintenanceTicket, 'id' | 'createdAt' | 'updatedAt'> = {
      vehicleId,
      title,
      description: description || '',
      priority,
      status: 'open',
      reportedById,
    };

    await addDoc(collection(db, 'tickets'), {
      ...newTicket,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    revalidatePath(`/admin/vehicles/${vehicleId}`);
    return { type: 'success', message: 'Maintenance ticket created successfully.' };

  } catch (error: any) {
    console.error("Failed to create ticket:", error);
    return { type: "error", message: `Failed to create ticket: ${error.message}` };
  }
}
