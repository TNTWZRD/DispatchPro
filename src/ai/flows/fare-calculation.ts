'use server';

/**
 * @fileOverview An AI agent for calculating estimated ride fares.
 *
 * - calculateFare - A function that calculates the estimated fare for a taxi ride.
 * - FareCalculationInput - The input type for the calculateFare function.
 * - FareCalculationOutput - The return type for the calculateFare function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const FareCalculationInputSchema = z.object({
  distance: z.number().describe('The distance of the ride in miles.'),
  timeOfDay: z.string().describe('The time of day (e.g., morning, afternoon, evening, night, peak hour).'),
  trafficConditions: z.string().describe('The current traffic conditions (e.g., light, moderate, heavy).'),
});
export type FareCalculationInput = z.infer<typeof FareCalculationInputSchema>;

const FareCalculationOutputSchema = z.object({
  estimatedFare: z.number().describe('The estimated fare for the ride in USD.'),
  fareBreakdown: z.object({
    baseFare: z.number().describe('The base fare amount.'),
    distanceCharge: z.number().describe('The charge based on distance.'),
    timeCharge: z.number().describe('The charge based on estimated time and traffic.'),
    surgeMultiplier: z.number().describe('The surge pricing multiplier, if any.'),
  }),
  reasoning: z.string().describe('The reasoning behind the fare calculation, including factors considered.'),
});
export type FareCalculationOutput = z.infer<typeof FareCalculationOutputSchema>;

export async function calculateFare(input: FareCalculationInput): Promise<FareCalculationOutput> {
  return fareCalculationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'fareCalculationPrompt',
  input: {schema: FareCalculationInputSchema},
  output: {schema: FareCalculationOutputSchema},
  prompt: `You are an expert taxi fare calculator. Your goal is to provide a realistic and well-justified fare estimate based on the provided ride details.

Calculate the estimated fare for a ride with the following characteristics:
- Distance: {{{distance}}} miles
- Time of Day: {{{timeOfDay}}}
- Traffic Conditions: {{{trafficConditions}}}

Your calculation should consider a base fare, a per-mile charge, and a time-based charge that accounts for traffic. Also, apply a surge multiplier if the time of day is a peak hour or traffic is heavy.

Provide a detailed breakdown of the fare and a clear reasoning for your calculation.
Base Fare: ~$3.00
Distance Rate: ~$1.50/mile
Time Rate: ~$0.50/minute (this is affected by traffic)
Surge: Apply a 1.2x to 1.8x multiplier for peak hours or heavy traffic.
`,
});

const fareCalculationFlow = ai.defineFlow(
  {
    name: 'fareCalculationFlow',
    inputSchema: FareCalculationInputSchema,
    outputSchema: FareCalculationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
