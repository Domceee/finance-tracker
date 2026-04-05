import { GoogleGenAI } from '@google/genai';
import type { OverviewData } from './overview.js';
import { buildOverviewInsightsPrompt } from './ai/prompt.js';
import { GEMINI_MODEL } from './ai/config.js';

const model = GEMINI_MODEL;

export type OverviewInsights = {
  summary: string;
  warning: string;
  tip: string;
};

export function parseOverviewInsights(value: string | null): OverviewInsights | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<OverviewInsights>;

    if (
      typeof parsed.summary !== 'string' ||
      typeof parsed.warning !== 'string' ||
      typeof parsed.tip !== 'string'
    ) {
      return null;
    }

    return {
      summary: parsed.summary,
      warning: parsed.warning,
      tip: parsed.tip,
    };
  } catch {
    return null;
  }
}

export function stringifyOverviewInsights(insights: OverviewInsights) {
  return JSON.stringify(insights);
}

function extractJson(text: string) {
  const trimmed = text.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fenced = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  throw new Error('Model did not return JSON');
}

export async function generateOverviewInsights(
  apiKey: string | undefined,
  overview: OverviewData,
): Promise<OverviewInsights> {
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model,
    contents: buildOverviewInsightsPrompt(overview),
  });

  const text = response.text ?? '';
  const json = extractJson(text);
  const parsed = JSON.parse(json) as Partial<OverviewInsights>;

  if (
    typeof parsed.summary !== 'string' ||
    typeof parsed.warning !== 'string' ||
    typeof parsed.tip !== 'string'
  ) {
    throw new Error('Invalid AI response shape');
  }

  return {
    summary: parsed.summary,
    warning: parsed.warning,
    tip: parsed.tip,
  };
}