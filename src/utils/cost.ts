import { ModelInfo } from '@/types';

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelInfo
): number {
  const inputCost = (inputTokens / 1_000_000) * model.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
  return inputCost + outputCost;
}
