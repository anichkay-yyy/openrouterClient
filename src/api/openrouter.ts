export interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | Array<{
    type: 'text';
    text: string;
  } | {
    type: 'image_url';
    image_url: {
      url: string;
    };
  }>;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
}

export interface StreamChatOptions {
  model?: string;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  abortSignal?: AbortSignal;
}

const BASE_URL = 'https://openrouter.ai/api/v1';

export async function getModels(token: string): Promise<OpenRouterModel[]> {
  const response = await fetch(`${BASE_URL}/models`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function* streamChat(
  token: string,
  messages: OpenRouterMessage[],
  options: StreamChatOptions = {}
): AsyncGenerator<string, void, unknown> {
  const controller = new AbortController();
  const signal = options.abortSignal || controller.signal;

  const body: any = {
    model: options.model || 'openai/gpt-4o-mini', // default model
    messages,
    stream: true,
    temperature: options.temperature || 0.7,
    ...options,
  };

  const response = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin, // optional for OpenRouter
      'X-Title': 'OpenRouter Chat PWA',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Chat API error: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No readable stream');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i];
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch {}
        }
      }

      buffer = lines[lines.length - 1];
    }
  } finally {
    reader.releaseLock();
  }
}
