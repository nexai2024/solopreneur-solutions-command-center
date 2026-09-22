import { logger } from "./logger";

/**
 * Real-time event bus (in-memory, per-process)
 *
 * NOTE: This is a single-process event bus. In a multi-instance production
 * deployment, replace the Map below with Redis Pub/Sub or a managed message
 * queue so events fan out across all instances. The public API here is
 * intentionally identical to what a Redis-backed implementation would expose.
 */

export type RealtimeEventType =
  | "task.created"
  | "task.updated"
  | "task.deleted"
  | "milestone.completed"
  | "lead.added"
  | "lead.updated"
  | "project.updated"
  | "build.completed"
  | "revenue.updated"
  | "content.published"
  | "campaign.started";

export type RealtimeEvent = {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: string;
  projectId?: string;
};

type EventCallback = (data: string) => void;

const eventListeners = new Map<string, Set<EventCallback>>();

/** Subscribe to an event type. Returns an unsubscribe function. */
export function subscribeToEvents(
  eventType: string,
  callback: EventCallback
): () => void {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, new Set());
  }
  eventListeners.get(eventType)!.add(callback);

  return () => {
    eventListeners.get(eventType)?.delete(callback);
  };
}

/**
 * Broadcast an event to all in-process subscribers.
 * Safe to call from server actions — failures never break the caller.
 */
export function broadcastEvent(
  type: RealtimeEventType | string,
  payload: Record<string, unknown>,
  userId?: string
): void {
  logger.info("Broadcasting real-time event", {
    eventType: type,
    userId,
  });

  try {
    const listeners = eventListeners.get(type);
    if (!listeners || listeners.size === 0) return;

    const data = JSON.stringify({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
    listeners.forEach((callback) => {
      try {
        callback(data);
      } catch {
        // A broken listener must never break the server action
      }
    });
  } catch {
    // Broadcasting is best-effort — never fail the originating action
  }
}

/** Test helper: clear all listeners */
export function _resetRealtimeForTests(): void {
  eventListeners.clear();
}
