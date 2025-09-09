
"use server";

import { z } from "zod";
import { sendMail } from "@/lib/email";

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
