"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * Configuration for real-time updates
 */
export interface RealtimeConfig {
  /** SSE endpoint for streaming updates */
  endpoint: string;
  /** React query key to invalidate on updates */
  queryKey?: string[];
  /** How often to reconnect on error (ms) */
  reconnectInterval?: number;
  /** Maximum reconnect attempts (-1 for infinite) */
  maxReconnectAttempts?: number;
  /** Callback when a new event is received */
  onEvent?: (event: RealtimeEvent) => void;
}

/**
 * Types of real-time events
 */
export type RealtimeEventType =
  | "task.updated"
  | "task.created"
  | "task.deleted"
  | "milestone.completed"
  | "lead.added"
  | "lead.updated"
  | "project.updated"
  | "build.completed"
  | "revenue.updated"
  | "content.published"
  | "campaign.started"
  | "ai.completed";

/**
 * Real-time event structure
 */
export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: Record<string, unknown>;
  timestamp: string;
  projectId?: string;
}

/**
 * Hook for subscribing to real-time dashboard updates via SSE
 *
 * @example
 * ```tsx
 * const { isConnected, lastEvent, reconnect } = useRealtimeUpdates({
 *   endpoint: "/api/realtime/dashboard",
 *   queryKey: ["dashboard"],
 *   onEvent: (event) => {
 *     console.log("Received update:", event.type);
 *   },
 * });
 * ```
 */
export function useRealtimeUpdates(config: RealtimeConfig) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptRef = useRef(0);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const reconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }
    eventSourceRef.current = null;
    reconnectAttemptRef.current = 0;
    connect();
  }, []);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(config.endpoint);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectAttemptRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeEvent;
        setLastEvent(data);

        // Call user callback if provided
        config.onEvent?.(data);

        // Invalidate React query cache if queryKey provided
        if (config.queryKey && typeof window !== "undefined") {
          // This would integrate with React Query in a real implementation
          // For now, we just log the event
        }
      } catch (e) {
        console.error("Failed to parse SSE event:", e);
      }
    };

    eventSource.onerror = (e) => {
      setIsConnected(false);
      const errorObj = e as Event;
      setError(new Error(errorObj.type || "SSE connection error"));

      // Reconnect logic
      const maxAttempts = config.maxReconnectAttempts ?? -1;
      const reconnectInterval = config.reconnectInterval ?? 3000;

      if (maxAttempts === -1 || reconnectAttemptRef.current < maxAttempts) {
        reconnectAttemptRef.current += 1;
        setTimeout(() => {
          eventSourceRef.current = null;
          connect();
        }, reconnectInterval);
      } else {
        toast.error("Real-time updates disconnected. Reconnect manually.");
      }
    };
  }, [config]);

  useEffect(() => {
    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connect]);

  return {
    isConnected,
    lastEvent,
    error,
    reconnect,
    reconnectAttempts: reconnectAttemptRef.current,
  };
}

/**
 * Hook for sending real-time events (server-side)
 * This would be used by server actions to broadcast updates
 */
export function broadcastRealtimeEvent(event: RealtimeEvent): void {
  // In a real implementation, this would use a pub/sub system
  // like Redis Pub/Sub or a message queue
  // For now, this is a placeholder for the API endpoint to handle
  console.log("Broadcasting real-time event:", event);
}

/**
 * Server action to broadcast an event (would be called from other server actions)
 */
export async function sendRealtimeUpdate(
  type: RealtimeEventType,
  payload: Record<string, unknown>,
  projectId?: string
): Promise<void> {
  const event: RealtimeEvent = {
    type,
    payload,
    timestamp: new Date().toISOString(),
    projectId,
  };

  // Broadcast to all connected clients
  broadcastRealtimeEvent(event);
}
