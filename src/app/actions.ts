'use server';

import { Message, CompressionResult, ModelInfo } from '@/types';

// Note: calculateCost is a pure function, moved to @/utils/cost.ts

const TTC_API_URL = 'https://api.thetokencompany.com/v1/compress';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getProviderConfig(provider: string): { url: string; apiKey: string; extraHeaders?: Record<string, string> } {
  if (provider === 'Groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set');
    return { url: GROQ_API_URL, apiKey };
  }

  // Default to OpenRouter for all other providers
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY environment variable is not set');
  return {
    url: OPENROUTER_API_URL,
    apiKey,
    extraHeaders: {
      'HTTP-Referer': 'https://thetokencompany.com',
      'X-Title': 'TTC Chat Sandbox',
    },
  };
}

export async function compressText(
  text: string,
  aggressiveness: number
): Promise<CompressionResult & { latencyMs: number }> {
  const apiKey = process.env.TTC_API_KEY;

  if (!apiKey) {
    throw new Error('TTC API key is required. Please enter your API key in the settings.');
  }

  const response = await fetch(TTC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'bear-1',
      input: text,
      compression_settings: {
        aggressiveness: aggressiveness,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Compression failed: ${error}`);
  }

  const data = await response.json();
  return {
    output: data.output,
    outputTokens: data.output_tokens,
    originalInputTokens: data.original_input_tokens,
    latencyMs: Math.round(data.compression_time * 1000),
  };
}

export async function chatCompletion(
  messages: Message[],
  model: string,
  provider: string
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number } }> {
  const config = getProviderConfig(provider);

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model: model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_completion_tokens: 1024,
      temperature: 1,
      top_p: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Chat completion failed: ${error}`);
  }

  const data = await response.json();

  return {
    content: data.choices[0]?.message?.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
    },
  };
}

export async function generateTestMessage(
  lastAssistantMessage: string,
  model: string,
  provider: string
): Promise<string> {
  const config = getProviderConfig(provider);

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are simulating a user in a chat conversation. Generate a short, natural follow-up message or question based on the AI\'s last response. Keep it very short. Just output the message, no quotes or explanation.',
        },
        {
          role: 'user',
          content: `The AI just said: "${lastAssistantMessage}"\n\nGenerate a follow-up message from the user:`,
        },
      ],
      temperature: 1,
      max_completion_tokens: 1024,
      top_p: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to generate test message: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'Tell me more about that.';
}

export async function getAvailableModels(): Promise<ModelInfo[]> {
  return [
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'Groq',
      inputCostPer1M: 0.05,
      outputCostPer1M: 0.08,
    },
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'DeepSeek',
      inputCostPer1M: 0.14,
      outputCostPer1M: 0.28,
    },
    {
      id: 'mistralai/mistral-small-24b-instruct-2501',
      name: 'Mistral Small 24B',
      provider: 'Mistral',
      inputCostPer1M: 0.10,
      outputCostPer1M: 0.30,
    },
    {
      id: 'mistralai/mistral-nemo',
      name: 'Mistral Nemo',
      provider: 'Mistral',
      inputCostPer1M: 0.03,
      outputCostPer1M: 0.03,
    },
    {
      id: 'google/gemini-flash-1.5-8b',
      name: 'Gemini Flash 1.5 8B',
      provider: 'Google',
      inputCostPer1M: 0.0375,
      outputCostPer1M: 0.15,
    },
  ];
}
