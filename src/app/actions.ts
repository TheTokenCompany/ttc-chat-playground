'use server';

import { Message, CompressionResult, ModelInfo } from '@/types';

// Note: calculateCost is a pure function, moved to @/utils/cost.ts

const TTC_API_URL = 'https://api.thetokencompany.com/v1/compress';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function testTtcApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch(TTC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'bear-1',
        input: 'test',
        compression_settings: {
          aggressiveness: 0.5,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      if (response.status === 401 || response.status === 403) {
        return { valid: false, error: 'Invalid API key' };
      }
      return { valid: false, error: `API error: ${error}` };
    }

    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Connection failed' };
  }
}

export async function compressText(
  text: string,
  aggressiveness: number,
  ttcApiKey?: string
): Promise<CompressionResult> {
  const apiKey = ttcApiKey || process.env.TTC_API_KEY;
  console.log('apiKey', `Bearer ${apiKey}`);

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
  };
}

export async function chatCompletion(
  messages: Message[],
  model: string
): Promise<{ content: string; usage: { promptTokens: number; completionTokens: number } }> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://thetokencompany.com',
      'X-Title': 'TTC Chat Sandbox',
    },
    body: JSON.stringify({
      model: model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 500,
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
  model: string
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://thetokencompany.com',
      'X-Title': 'TTC Chat Sandbox',
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
  // Return curated list of models as specified in README
  // Prices are approximate per 1M tokens
  return [
    {
      id: 'deepseek/deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'DeepSeek',
      inputCostPer1M: 0.14,
      outputCostPer1M: 0.28,
    },
    {
      id: 'deepseek/deepseek-r1',
      name: 'DeepSeek R1',
      provider: 'DeepSeek',
      inputCostPer1M: 0.55,
      outputCostPer1M: 2.19,
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
      id: 'google/gemini-2.0-flash-001',
      name: 'Gemini 2.0 Flash',
      provider: 'Google',
      inputCostPer1M: 0.10,
      outputCostPer1M: 0.40,
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

