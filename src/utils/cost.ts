import { ModelInfo } from '@/types';

export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: ModelInfo,
  cachedInputTokens: number = 0
): number {
  const uncachedInputTokens = inputTokens - cachedInputTokens;
  const cachedCostPer1M = model.cachedInputCostPer1M ?? model.inputCostPer1M;

  const inputCost = (uncachedInputTokens / 1_000_000) * model.inputCostPer1M;
  const cachedCost = (cachedInputTokens / 1_000_000) * cachedCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * model.outputCostPer1M;
  return inputCost + cachedCost + outputCost;
}
