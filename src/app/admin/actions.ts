
"use server";

import 'dotenv/config';
import { z } from "zod";
import { sendMail } from "@/lib/email";
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import type { Driver, Vehicle } from '@/lib/types';

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
    return { type: "success", message: `Invitation sent successfully to ${email}.` };
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
    const validatedFields = createDriverSchema.safeParse({
        name: formData.get("name"),
        phoneNumber: formData.get("phoneNumber"),
    });

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

        const newDriver: Driver = {
            id: newDriverRef.id,
            name,
            phoneNumber,
            rating: 5,
            status: 'offline',
            location: { x: 50, y: 50 },
        };

        await setDoc(newDriverRef, newDriver);

        return { type: "success", message: `Driver "${name}" created successfully.` };
    } catch (error) {
        console.error("Failed to create driver:", error);
        return { type: "error", message: "Failed to create the driver. Please try again later." };
    }
}


const createVehicleSchema = z.object({
  make: z.string().min(2, { message: "Make is required." }),
  model: z.string().min(2, { message: "Model is required." }),
  year: z.coerce.number().min(1980, { message: "Year must be after 1980." }).max(new Date().getFullYear() + 1, { message: "Year cannot be in the distant future." }),
  licensePlate: z.string().min(2, { message: "License plate is required." }),
});

export async function createVehicle(prevState: any, formData: FormData) {
    const validatedFields = createVehicleSchema.safeParse({
        make: formData.get("make"),
        model: formData.get("model"),
        year: formData.get("year"),
        licensePlate: formData.get("licensePlate"),
    });

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid vehicle details provided.",
        };
    }

    try {
        const { make, model, year, licensePlate } = validatedFields.data;

        const newVehicle: Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'> = {
            make,
            model,
            year,
            licensePlate,
            status: 'active',
            currentDriverId: null,
        };
        
        await addDoc(collection(db, 'vehicles'), {
            ...newVehicle,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        return { type: "success", message: `Vehicle "${year} ${make} ${model}" created successfully.` };
    } catch (error) {
        console.error("Failed to create vehicle:", error);
        return { type: "error", message: "Failed to create the vehicle. Please try again later." };
    }
}
