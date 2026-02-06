import { NextRequest, NextResponse } from 'next/server';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

function getProviderConfig(provider: string): { url: string; apiKey: string; extraHeaders?: Record<string, string> } {
  if (provider === 'Groq') {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('GROQ_API_KEY environment variable is not set');
    return { url: GROQ_API_URL, apiKey };
  }

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

export async function POST(request: NextRequest) {
  const { messages, model, provider } = await request.json();

  const config = getProviderConfig(provider);

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      ...config.extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
      max_completion_tokens: 1024,
      temperature: 1,
      top_p: 1,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: `Chat completion failed: ${error}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({
    content: data.choices[0]?.message?.content || '',
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
    },
  });
}
