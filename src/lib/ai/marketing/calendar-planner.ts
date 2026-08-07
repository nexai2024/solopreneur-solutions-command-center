import { aiComplete, AI_MODEL } from "@/lib/ai-config";

export interface CalendarPlanOptions {
  productName: string;
  goals: string[];
  weeks: number;
  channels: string[];
}

export interface CalendarEntry {
  title: string;
  date: string;
  type: string;
  description: string;
}

export interface GeneratedCalendarPlan {
  entries: CalendarEntry[];
}

export async function generateCalendarPlan(options: CalendarPlanOptions): Promise<GeneratedCalendarPlan> {
  const { productName, goals, weeks, channels } = options;

  const systemPrompt = `You are a marketing strategist who creates comprehensive content calendars for indie developers and SaaS founders. You plan content that builds momentum and supports business goals.

Guidelines:
- Balance content across specified channels
- Vary content types to maintain audience interest
- Align content with business goals and product milestones
- Consider optimal posting times and frequency per channel
- Create a realistic, achievable schedule

Always return valid JSON.`;

  const today = new Date();
  const startDate = today.toISOString().split("T")[0];

  const prompt = `Create a ${weeks}-week content calendar for:

Product: ${productName}
Goals: ${goals.join(", ")}
Channels: ${channels.join(", ")}
Starting from: ${startDate}

Return a JSON object with:
- entries: An array of content calendar entries, each with:
  - title: A brief title for the content piece
  - date: ISO date string (YYYY-MM-DD) within the ${weeks}-week window starting from ${startDate}
  - type: One of "BLOG_POST", "SOCIAL_POST", "NEWSLETTER", "AD_CAMPAIGN", "CUSTOM"
  - description: A 1-2 sentence description of the content to create

Aim for 2-4 entries per week, distributed across the specified channels.`;

  const response = await aiComplete({
    prompt,
    systemPrompt,
    jsonMode: true,
    model: AI_MODEL,
  });

  const parsed = JSON.parse(response);

  return {
    entries: parsed.entries || [],
  };
}
