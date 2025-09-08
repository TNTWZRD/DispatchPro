import { config } from 'dotenv';
config();

import '@/ai/flows/log-call-from-audio.ts';
import '@/ai/flows/driver-eta-prediction.ts';
import '@/ai/flows/parse-voice-command.ts';
