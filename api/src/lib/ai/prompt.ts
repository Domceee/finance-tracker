import type { OverviewData } from '../overview.js';

export function buildOverviewInsightsPrompt(overview: OverviewData) {
    const breakdown = overview.categoryBreakdown.map(
        (item) => `- ${item.category}: ${item.amount.toFixed(2)} EUR (${item.percentage}% of spending)`,
    ).join('\n');

    return `
    You are helping a personal finance app explain one month's spending.

    Return ONLY valid JSON with exactly this shape:
    {
        "summary": "string",
        "warning": "string",
        "tip": "string"
    }

    Rules:
    - Keep each field short, practical, and specific.
    - Do NOT use markdown.
    - Do NOT mention being an AI.
    - Do NOT invent data.
    - If the month has little to no spending data, say that simply.

    Month: ${overview.year}-${String(overview.month).padStart(2, '0')}
    Income total: ${overview.incomeTotal.toFixed(2)} EUR
    Spent total: ${overview.spentTotal.toFixed(2)} EUR
    Left total: ${overview.leftTotal.toFixed(2)} EUR

    Category breakdown:
    ${breakdown || '- No expense categories'}
    `.trim();
}