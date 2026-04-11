import type { AppEnv } from '@tamada/config';
import { type ParsedFilters, type ParseResult, parseQueryRuleBased } from './parser';
import { CITIES, CATEGORIES } from './aliases';

const SYSTEM_PROMPT = `You are a search query parser for a talent/performer marketplace in Kazakhstan.
Parse the user's request and extract search filters. Return ONLY a valid JSON object, no explanations.

Today is {TODAY}.

JSON schema (use null for unknown fields):
{
  "city": string|null,         // Russian city name: Алматы, Астана, Шымкент, Петропавловск, etc.
  "region": string|null,       // Russian region/oblast name, or null
  "category": string|null,     // performer category in Russian (one of: тамада, ведущий, визажист, фотограф, видеограф, музыкант, диджей, певец, танцор, аниматор, флорист, шоу)
  "subcategory": string|null,
  "date": string|null,         // ISO date YYYY-MM-DD
  "time_from": string|null,    // HH:MM (24h)
  "time_to": string|null,      // HH:MM (24h)
  "price_from": number|null,
  "price_to": number|null,
  "only_free": boolean,
  "featured": boolean
}

Time period rules:
- утром/утро = 06:00 to 12:00
- днем/днём/день = 12:00 to 18:00
- вечером/вечер = 18:00 to 23:59
- ночью = 00:00 to 05:59

Category aliases:
- тамада, тамады → тамада
- ведущий, ведущего, свадебный ведущий → ведущий
- визажист, макияж, мейкап → визажист
- фотограф, фотосессия → фотограф
- диджей, dj, дж → диджей

Relative dates (relative to today {TODAY}):
- сегодня → today's date
- завтра → tomorrow's date
- в субботу → nearest upcoming Saturday
- на выходных → nearest upcoming Saturday
- "12 августа", "12 авг" → that date in current or next year`;

type OpenAIResponse = {
  city: string | null;
  region: string | null;
  category: string | null;
  subcategory: string | null;
  date: string | null;
  time_from: string | null;
  time_to: string | null;
  price_from: number | null;
  price_to: number | null;
  only_free: boolean;
  featured: boolean;
};

async function callOpenAI(apiKey: string, model: string, userText: string): Promise<OpenAIResponse | null> {
  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = SYSTEM_PROMPT.replace(/{TODAY}/g, today);

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
      temperature: 0,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) return null;
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  const parsed = JSON.parse(content) as OpenAIResponse;
  return parsed;
}

// Normalize AI-returned city to canonical form from CITIES dict (e.g. "алматы" → "Алматы")
function normalizeCity(city: string | null): string | undefined {
  if (!city) return undefined;
  const key = city.toLowerCase().trim();
  return CITIES[key] ?? city;
}

// Normalize AI-returned category to canonical form (e.g. "Тамада" → "тамада")
function normalizeCategory(cat: string | null): string | undefined {
  if (!cat) return undefined;
  const key = cat.toLowerCase().trim();
  return CATEGORIES[key] ?? key;
}

function buildUnderstood(raw: OpenAIResponse): string[] {
  const out: string[] = [];
  if (raw.city)      out.push(`Город: ${raw.city}`);
  if (raw.region)    out.push(`Регион: ${raw.region}`);
  if (raw.category)  out.push(`Категория: ${raw.category}`);
  if (raw.subcategory) out.push(`Подкатегория: ${raw.subcategory}`);
  if (raw.date)      out.push(`Дата: ${raw.date}`);
  if (raw.time_from && raw.time_to) out.push(`Время: ${raw.time_from}–${raw.time_to}`);
  if (raw.price_to)  out.push(`Цена до: ${raw.price_to.toLocaleString('ru-RU')} ₸`);
  if (raw.price_from) out.push(`Цена от: ${raw.price_from.toLocaleString('ru-RU')} ₸`);
  if (raw.only_free) out.push('Только свободные');
  if (raw.featured)  out.push('Рекомендуемые');
  return out;
}

export async function parseSearchQuery(text: string, env: AppEnv): Promise<ParseResult> {
  const aiEnabled = env.AI_SEARCH_ENABLED === 'true';
  const apiKey    = env.OPENAI_API_KEY;

  if (aiEnabled && apiKey) {
    try {
      const raw = await callOpenAI(apiKey, env.AI_SEARCH_MODEL, text);
      if (raw) {
        const filters: ParsedFilters = {
          city:       normalizeCity(raw.city),
          region:     raw.region     ?? undefined,
          category:   normalizeCategory(raw.category),
          subcategory:raw.subcategory ? raw.subcategory.toLowerCase().trim() : undefined,
          date:       raw.date       ?? undefined,
          time_from:  raw.time_from  ?? undefined,
          time_to:    raw.time_to    ?? undefined,
          price_from: raw.price_from ?? undefined,
          price_to:   raw.price_to   ?? undefined,
          only_free:  raw.only_free  || undefined,
          featured:   raw.featured   || undefined,
        };
        return { filters, understood: buildUnderstood(raw), mode: 'llm' };
      }
    } catch {
      // fall through to rule-based
    }
  }

  // Fallback: rule-based
  return parseQueryRuleBased(text);
}
