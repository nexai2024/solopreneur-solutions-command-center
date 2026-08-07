import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  parseISO,
} from 'date-fns';
import type { CalendarEvent, CalendarEntryType, CalendarEntryStatus } from './types';

/**
 * Returns all days to display for a month view calendar grid.
 * Includes leading/trailing days from adjacent months to fill the week rows.
 */
export function getMonthDays(date: Date): Date[] {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
}

/**
 * Returns all 7 days of the week containing the given date.
 */
export function getWeekDays(date: Date): Date[] {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(date, { weekStartsOn: 0 });

  return eachDayOfInterval({ start: weekStart, end: weekEnd });
}

/**
 * Groups calendar events by their date string (YYYY-MM-DD).
 * Returns a map where keys are date strings and values are arrays of events for that date.
 */
export function groupEventsByDate(
  events: CalendarEvent[]
): Record<string, CalendarEvent[]> {
  const grouped: Record<string, CalendarEvent[]> = {};

  for (const event of events) {
    const dateKey = event.date.split('T')[0];
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(event);
  }

  return grouped;
}

export interface CalendarFiltersState {
  types: CalendarEntryType[];
  status: CalendarEntryStatus | 'ALL';
}

/**
 * Filters calendar events based on the current filter state.
 * Returns only events matching the selected content types and status.
 */
export function filterEvents(
  events: CalendarEvent[],
  filters: CalendarFiltersState
): CalendarEvent[] {
  return events.filter((event) => {
    const typeMatch =
      filters.types.length === 0 || filters.types.includes(event.type);
    const statusMatch =
      filters.status === 'ALL' || event.status === filters.status;
    return typeMatch && statusMatch;
  });
}

/**
 * Returns events that fall on a specific day.
 */
export function getEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events.filter((event) => {
    const eventDate = parseISO(event.date);
    return isSameDay(eventDate, day);
  });
}
