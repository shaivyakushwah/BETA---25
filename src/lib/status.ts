/** Client-side view of which server services are switched on. */
import { getCurrentSnapshot } from "@/lib/db";

export function providerStatus(): { available: boolean; model: string; note: string } {
  const s = getCurrentSnapshot().status;
  return { available: s.aiAvailable, model: s.aiModel, note: s.aiNote };
}

export function geminiAvailable(): boolean {
  return getCurrentSnapshot().status.aiAvailable;
}

export function resendStatus(): { available: boolean; fromEmail: string } {
  const s = getCurrentSnapshot().status;
  return { available: s.resendAvailable, fromEmail: s.fromEmail };
}
