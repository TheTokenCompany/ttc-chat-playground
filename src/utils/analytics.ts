import { track } from '@vercel/analytics';

/**
 * Track when compression is performed
 * Uses 2 parameters: tokens_saved and ratio
 */
export function trackCompression(tokensSaved: number, compressionRatio: number) {
  track('compression', {
    tokens_saved: tokensSaved,
    ratio: Math.round(compressionRatio),
  });
}

/**
 * Track when a message is sent
 * Uses 2 parameters: model and turn_number
 */
export function trackMessageSent(model: string, turnNumber: number) {
  track('message_sent', {
    model: model,
    turn: turnNumber,
  });
}
