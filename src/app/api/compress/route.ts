import { NextRequest, NextResponse } from 'next/server';

const TTC_API_URL = 'https://api.thetokencompany.com/v1/compress';

export async function POST(request: NextRequest) {
  const { text, aggressiveness, maxOutputTokens } = await request.json();

  const apiKey = process.env.TTC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'TTC API key is required.' },
      { status: 500 }
    );
  }

  const compressionSettings: Record<string, unknown> = {
    aggressiveness,
  };
  if (maxOutputTokens != null) {
    compressionSettings.max_output_tokens = maxOutputTokens;
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
      compression_settings: compressionSettings,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    return NextResponse.json(
      { error: `Compression failed: ${error}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({
    output: data.output,
    outputTokens: data.output_tokens,
    originalInputTokens: data.original_input_tokens,
    latencyMs: Math.round(data.compression_time * 1000),
  });
}
