import { NextRequest, NextResponse } from 'next/server';

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 20;
const MAX_BODY_BYTES = 50 * 1024; // 50 KB
const CLEANUP_INTERVAL_MS = 60_000;

const requestLog = new Map<string, number[]>();
let lastCleanup = Date.now();

function getIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - WINDOW_MS;
  for (const [ip, timestamps] of requestLog) {
    const valid = timestamps.filter((t) => t > cutoff);
    if (valid.length === 0) {
      requestLog.delete(ip);
    } else {
      requestLog.set(ip, valid);
    }
  }
}

export function middleware(request: NextRequest) {
  // Only rate-limit API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Reject oversized payloads early
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Request body too large. Maximum size is 50KB.' },
      { status: 413 }
    );
  }

  // Sliding window rate limiting
  const ip = getIp(request);
  const now = Date.now();
  const cutoff = now - WINDOW_MS;

  cleanupExpiredEntries();

  const timestamps = requestLog.get(ip) || [];
  const recentTimestamps = timestamps.filter((t) => t > cutoff);

  if (recentTimestamps.length >= MAX_REQUESTS) {
    const oldestInWindow = recentTimestamps[0];
    const retryAfter = Math.ceil((oldestInWindow + WINDOW_MS - now) / 1000);

    return NextResponse.json(
      { error: 'Too many requests. Please slow down and try again shortly.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }

  recentTimestamps.push(now);
  requestLog.set(ip, recentTimestamps);

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
