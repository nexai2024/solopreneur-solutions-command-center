import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-Sent Events endpoint for real-time updates
 *
 * Clients connect to this endpoint and receive real-time updates
 * about tasks, milestones, leads, builds, and other events.
 *
 * In production, this would use a pub/sub system (Redis, etc.)
 * to broadcast events across multiple server instances.
 */

// Simple in-memory event bus for demo purposes
// In production, use Redis Pub/Sub or a message queue
type EventCallback = (data: string) => void;
const eventListeners = new Map<string, Set<EventCallback>>();

function broadcast(eventType: string, data: object) {
  const listeners = eventListeners.get(eventType);
  if (listeners) {
    const payload = JSON.stringify({
      type: eventType,
      payload: data,
      timestamp: new Date().toISOString(),
    });
    listeners.forEach((callback) => callback(payload));
  }
}

// Register event listeners from server actions
export function subscribeToEvents(
  eventType: string,
  callback: EventCallback
): () => void {
  if (!eventListeners.has(eventType)) {
    eventListeners.set(eventType, new Set());
  }
  eventListeners.get(eventType)!.add(callback);

  // Return unsubscribe function
  return () => {
    eventListeners.get(eventType)?.delete(callback);
  };
}

// Helper to broadcast events from server actions
export function broadcastEvent(
  type: string,
  payload: object,
  userId?: string
) {
  logger.info("Broadcasting real-time event", {
    eventType: type,
    userId,
    timestamp: new Date().toISOString(),
  });

  broadcast(type, payload);
}

function getUserProjectIds(userId: string) {
  return prisma.project.findMany({
    where: { userId },
    select: { id: true },
  }).then((projects) => projects.map((p) => p.id));
}

export async function GET(request: Request) {
  const user = await requireAuth();
  const userId = user.id;

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection event
      const connectEvent = JSON.stringify({
        type: "connected",
        userId,
        timestamp: new Date().toISOString(),
      });
      controller.enqueue(new TextEncoder().encode(`data: ${connectEvent}\n\n`));

      // Subscribe to all relevant event types for this user
      const projectIds = await getUserProjectIds(userId);

      const unsubscribeTasks: (() => void)[] = [];

      // Subscribe to task events for user's projects
      const taskUnsubscribe = subscribeToEvents("task.*", (data) => {
        try {
          const event = JSON.parse(data);
          if (event.projectId && projectIds.includes(event.projectId)) {
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }
        } catch {
          // Ignore parse errors
        }
      });
      unsubscribeTasks.push(taskUnsubscribe);

      // Subscribe to lead events
      const leadUnsubscribe = subscribeToEvents("lead.*", (data) => {
        try {
          const event = JSON.parse(data);
          controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
        } catch {
          // Ignore parse errors
        }
      });
      unsubscribeTasks.push(leadUnsubscribe);

      // Subscribe to milestone events
      const milestoneUnsubscribe = subscribeToEvents("milestone.*", (data) => {
        try {
          const event = JSON.parse(data);
          if (event.projectId && projectIds.includes(event.projectId)) {
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }
        } catch {
          // Ignore parse errors
        }
      });
      unsubscribeTasks.push(milestoneUnsubscribe);

      // Subscribe to build events
      const buildUnsubscribe = subscribeToEvents("build.*", (data) => {
        try {
          const event = JSON.parse(data);
          if (event.projectId && projectIds.includes(event.projectId)) {
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }
        } catch {
          // Ignore parse errors
        }
      });
      unsubscribeTasks.push(buildUnsubscribe);

      // Subscribe to revenue events
      const revenueUnsubscribe = subscribeToEvents("revenue.*", (data) => {
        controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
      });
      unsubscribeTasks.push(revenueUnsubscribe);

      // Heartbeat to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        unsubscribeTasks.forEach((unsubscribe) => unsubscribe());
      });
    },

    cancel(controller) {
      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
