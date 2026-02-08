export type MessageRole = 'system' | 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  isCompressedHistory?: boolean;
}

export interface DisplayMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSettings {
  compressionFrequency: number; // 5-15
  compressionAggressiveness: number; // 0.1-0.9
  showRawMessages: boolean;
  ttcApiKey: string;
}

export interface TokenStats {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalCompressedTokens: number;
  savedTokens: number;
  cost: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  cachedInputCostPer1M?: number;
  contextWindow: number;
}

export interface CompressionResult {
  output: string;
  outputTokens: number;
  originalInputTokens: number;
}

export interface ChatState {
  displayMessages: DisplayMessage[];
  apiMessages: Message[];
  systemPrompt: string;
  compressedHistory: string | null;
  messagesSinceCompression: number;
  stats: TokenStats;
}
