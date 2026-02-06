interface CompressionCelebrationProps {
  tokensSaved: number;
  moneySaved: number;
  compressionRatio: number;
  latencyMs: number;
}

export function CompressionCelebration({
  tokensSaved,
  moneySaved,
  compressionRatio,
  latencyMs,
}: CompressionCelebrationProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/20 to-green-500/10 animate-pulse" />

      <div className="relative bg-zinc-900/95 backdrop-blur-sm border border-green-500/50 rounded-2xl p-4 sm:p-8 shadow-2xl shadow-green-500/20 animate-bounce-in max-w-sm w-full">
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-400 rounded-full animate-ping" />
        <div className="absolute -top-1 -right-3 w-3 h-3 bg-emerald-400 rounded-full animate-ping delay-100" />
        <div className="absolute -bottom-2 left-1/4 w-3 h-3 bg-green-300 rounded-full animate-ping delay-200" />
        <div className="absolute -bottom-1 -right-2 w-4 h-4 bg-emerald-300 rounded-full animate-ping delay-300" />

        <div className="text-center">
          <div className="text-4xl mb-3">✨</div>
          <h3 className="text-xl font-bold text-green-400 mb-4">Context Compressed!</h3>

          <div className="space-y-3">
            <div className="bg-green-500/20 rounded-lg p-3">
              <div className="text-3xl font-bold text-green-400">
                {tokensSaved.toLocaleString()}
              </div>
              <div className="text-sm text-green-300/80">tokens saved</div>
            </div>

            <div className="bg-emerald-500/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">
                ${moneySaved.toFixed(6)}
              </div>
              <div className="text-sm text-emerald-300/80">estimated savings</div>
            </div>

            <div className="flex justify-center gap-4 text-sm text-zinc-400">
              <span>
                <span className="text-green-400 font-semibold">
                  {compressionRatio.toFixed(0)}%
                </span>{' '}
                ratio
              </span>
              <span>
                <span className="text-cyan-400 font-semibold">
                  {latencyMs}ms
                </span>{' '}
                latency
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
