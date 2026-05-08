import { config } from '../config';

export type MiniMaxMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type MiniMaxJsonOptions = {
  temperature?: number;
  maxTokens?: number;
  fallback?: unknown;
};

function extractAssistantContent(payload: any): string {
  const choice = payload?.choices?.[0];
  return (
    choice?.message?.content ||
    choice?.delta?.content ||
    payload?.reply ||
    payload?.output_text ||
    payload?.data?.message ||
    ''
  );
}

function extractJsonText(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return trimmed;
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstObj = trimmed.indexOf('{');
  const lastObj = trimmed.lastIndexOf('}');
  if (firstObj >= 0 && lastObj > firstObj) return trimmed.slice(firstObj, lastObj + 1);
  const firstArr = trimmed.indexOf('[');
  const lastArr = trimmed.lastIndexOf(']');
  if (firstArr >= 0 && lastArr > firstArr) return trimmed.slice(firstArr, lastArr + 1);
  return trimmed;
}

export async function callMiniMaxText(messages: MiniMaxMessage[], options: MiniMaxJsonOptions = {}) {
  if (!config.minimax.enabled || !config.minimax.apiKey) {
    throw new Error('MINIMAX_API_KEY is not configured');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.minimax.timeoutMs);

  try {
    const response = await fetch(config.minimax.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.minimax.apiKey}`
      },
      body: JSON.stringify({
        model: config.minimax.model,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 1200
      }),
      signal: controller.signal
    });

    const rawText = await response.text();
    if (!response.ok) {
      throw new Error(`MiniMax request failed: ${response.status} ${rawText}`);
    }

    let payload: any;
    try {
      payload = JSON.parse(rawText);
    } catch {
      return rawText;
    }

    const content = extractAssistantContent(payload);
    if (!content) {
      throw new Error(`MiniMax response has no assistant content: ${rawText}`);
    }
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callMiniMaxJson<T>(messages: MiniMaxMessage[], options: MiniMaxJsonOptions = {}): Promise<T> {
  const content = await callMiniMaxText(messages, options);
  try {
    return JSON.parse(extractJsonText(content)) as T;
  } catch (error) {
    throw new Error(`MiniMax JSON parse failed: ${(error as Error).message}; raw=${content}`);
  }
}
