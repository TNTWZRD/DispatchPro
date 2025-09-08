'use server';

/**
 * @fileOverview An AI flow for parsing voice commands to manage dispatch operations.
 *
 * - parseVoiceCommand - A function that takes a text command and returns a structured action.
 * - VoiceCommandInput - The input type for the parseVoiceCommand function.
 * - VoiceCommandOutput - The return type for the parseVoiceCommand function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const VoiceCommandInputSchema = z.object({
  command: z.string().describe('The voice command spoken by the user.'),
  rides: z.array(z.object({
      id: z.string(),
      status: z.string(),
  })).describe('The list of current rides.'),
    drivers: z.array(z.object({
        id: z.string(),
        name: z.string(),
    })).describe('The list of available drivers.')
});
export type VoiceCommandInput = z.infer<typeof VoiceCommandInputSchema>;

const VoiceCommandOutputSchema = z.object({
  action: z.enum(['assign', 'updateStatus', 'delete', 'cancel', 'unknown']).describe('The parsed action to perform.'),
  rideId: z.string().optional().describe('The ID of the ride to act upon (e.g., "ride-1").'),
  driverId: z.string().optional().describe('The ID of the driver for assignments (e.g., "driver-2").'),
  newStatus: z.enum(['pending', 'assigned', 'in-progress', 'completed', 'cancelled']).optional().describe('The new status for a ride.'),
  reasoning: z.string().describe('A brief explanation of why the action was chosen or if the command was unclear.'),
});
export type VoiceCommandOutput = z.infer<typeof VoiceCommandOutputSchema>;

export async function parseVoiceCommand(input: VoiceCommandInput): Promise<VoiceCommandOutput> {
  return voiceCommandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'voiceCommandPrompt',
  input: { schema: VoiceCommandInputSchema },
  output: { schema: VoiceCommandOutputSchema },
  prompt: `You are a voice command interpreter for a taxi dispatch system. Your task is to parse a user's spoken command into a structured action object.

You need to correctly identify rides and drivers. Ride IDs are in the format "ride-X" and driver IDs are in "driver-X". The user might say "ride one" which you should map to "ride-1".

Today's date is ${new Date().toISOString()}.

Here is the current state of the system:
- Rides: {{json rides}}
- Drivers: {{json drivers}}

User command: "{{command}}"

Possible Actions:
- 'assign': Assign a pending ride to an available driver. Requires rideId and driverId.
- 'updateStatus': Change the status of a ride (e.g., to 'in-progress', 'completed'). Requires rideId and newStatus.
- 'delete' or 'cancel': Cancel a ride. Use the 'cancelled' status. Requires rideId and newStatus should be 'cancelled'.
- 'unknown': If the command is unclear or cannot be mapped to an action.

Analyze the command and determine the appropriate action and parameters. Provide a brief reasoning for your decision. If the command is ambiguous or incomplete, set the action to 'unknown' and explain what is missing in the reasoning.
`,
});

const voiceCommandFlow = ai.defineFlow(
  {
    name: 'voiceCommandFlow',
    inputSchema: VoiceCommandInputSchema,
    outputSchema: VoiceCommandOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
