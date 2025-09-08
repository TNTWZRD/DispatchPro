import { config } from 'dotenv';
config();

import '@/ai/flows/dispatching-suggestions.ts';
import '@/ai/flows/driver-eta-prediction.ts';
import '@/ai/flows/fare-calculation.ts';
