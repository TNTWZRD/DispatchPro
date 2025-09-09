
"use server";

import 'dotenv/config';
import { z } from "zod";
import { sendMail } from "@/lib/email";
import { db } from '@/lib/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { Driver } from '@/lib/types';

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
  vehicle: z.string().min(2, { message: "Vehicle must be at least 2 characters." }),
});

export async function createDriver(prevState: any, formData: FormData) {
    const validatedFields = createDriverSchema.safeParse({
        name: formData.get("name"),
        vehicle: formData.get("vehicle"),
    });

    if (!validatedFields.success) {
        return {
            type: "error",
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Invalid driver details provided.",
        };
    }

    try {
        const { name, vehicle } = validatedFields.data;

        const newDriver: Omit<Driver, 'id'> = {
            name,
            vehicle,
            rating: 5,
            status: 'offline',
            location: { x: 50, y: 50 },
            // This driver is not linked to a user account, so no uid.
            // Firestore will auto-generate an ID.
        };

        await addDoc(collection(db, 'drivers'), newDriver);

        return { type: "success", message: `Driver "${name}" created successfully.` };
    } catch (error) {
        console.error("Failed to create driver:", error);
        return { type: "error", message: "Failed to create the driver. Please try again later." };
    }
}
