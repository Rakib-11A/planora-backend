import type { EmitNotificationInput } from "./notification.types";
import { emitNotification } from "./notification.service";

// Centralized app-level trigger point (queue-ready seam).
export async function emitNotificationEvent(
  input: EmitNotificationInput,
): Promise<void> {
  await emitNotification(input);
}

