import { z } from 'zod';

const CreateRideSchema = z.object({
    intent: z.literal('create'),
    passengerPhone: z.string().describe("The passenger's phone number."),
    pickupLocation: z.string().describe('The pickup location.'),
    dropoffLocation: z.string().describe('The dropoff location.'),
    passengerCount: z.coerce.number().describe('The number of passengers.'),
    scheduledTime: z.string().optional().describe('The scheduled time for pickup, if any (in ISO 8601 format).'),
    movingFee: z.boolean().default(false).describe('Whether a moving fee applies.'),
    reasoning: z.string().describe('A brief explanation of the extracted details.'),
});

const ManageRideSchema = z.object({
    intent: z.literal('manage'),
    action: z.enum(['assign', 'updateStatus', 'delete', 'cancel', 'unknown']).describe('The parsed action to perform.'),
    rideId: z.string().optional().describe('The ID of the ride to act upon (e.g., "ride-1").'),
    driverId: z.string().optional().describe('The ID of the driver for assignments (e.g., "driver-2").'),
    newStatus: z.enum(['pending', 'assigned', 'in-progress', 'completed', 'cancelled']).optional().describe('The new status for a ride.'),
    reasoning: z.string().describe('A brief explanation of why the action was chosen or if the command was unclear.'),
});

const UnknownIntentSchema = z.object({
    intent: z.literal('unknown'),
    reasoning: z.string().describe('An explanation of why the intent could not be determined.'),
});


export const VoiceOutputSchema = z.union([CreateRideSchema, ManageRideSchema, UnknownIntentSchema]);
