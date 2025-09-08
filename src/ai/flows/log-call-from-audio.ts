'use server';

/**
 * @fileOverview An AI flow for parsing ride details from an audio recording.
 *
 * - logCallFromAudio - A function that takes an audio recording and returns structured ride details.
 * - LogCallFromAudioInput - The input type for the logCallFromAudio function.
 * - LogCallFromAudioOutput - The return type for the logCallFromAudio function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const LogCallFromAudioInputSchema = z.object({
  audioDataUri: z
    .string()
    .describe(
      "An audio recording of a call, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type LogCallFromAudioInput = z.infer<typeof LogCallFromAudioInputSchema>;

const LogCallFromAudioOutputSchema = z.object({
    passengerPhone: z.string().describe("The passenger's phone number."),
    pickupLocation: z.string().describe('The pickup location.'),
    dropoffLocation: z.string().describe('The dropoff location.'),
    passengerCount: z.coerce.number().describe('The number of passengers.'),
    scheduledTime: z.string().optional().describe('The scheduled time for pickup, if any (in ISO 8601 format).'),
    movingFee: z.boolean().default(false).describe('Whether a moving fee applies.'),
});
export type LogCallFromAudioOutput = z.infer<typeof LogCallFromAudioOutputSchema>;


export async function logCallFromAudio(input: LogCallFromAudioInput): Promise<LogCallFromAudioOutput> {
  return logCallFromAudioFlow(input);
}

const prompt = ai.definePrompt({
  name: 'logCallFromAudioPrompt',
  input: {schema: LogCallFromAudioInputSchema},
  output: {schema: LogCallFromAudioOutputSchema},
  prompt: `You are an expert taxi dispatcher assistant. Your task is to listen to a recorded call and extract the details for a new ride request.

  The current date and time is ${new Date().toISOString()}.

  Listen to the following audio and extract the required information.
  Audio: {{media url=audioDataUri}}

  - Identify the passenger's phone number.
  - Identify the pickup location.
  - Identify the dropoff location.
  - Identify the number of passengers.
  - Identify if a specific pickup time is mentioned. If so, provide it in ISO 8601 format.
  - Identify if this is a "moving" service, which implies the movingFee should be true.

  Provide the extracted information in the specified JSON format.
`,
});

const logCallFromAudioFlow = ai.defineFlow(
  {
    name: 'logCallFromAudioFlow',
    inputSchema: LogCallFromAudioInputSchema,
    outputSchema: LogCallFromAudioOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
