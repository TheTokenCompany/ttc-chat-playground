interface ContextSizeGraphProps {
  contextHistory: number[];
  uncompressedHistory: number[];
}

export function ContextSizeGraph({ contextHistory, uncompressedHistory }: ContextSizeGraphProps) {
  if (contextHistory.length === 0) return null;

  const allValues = [...contextHistory, ...uncompressedHistory];
  const maxTokens = Math.max(...allValues, 1);
  const minTokens = Math.min(...allValues);
  const range = maxTokens - minTokens || 1;

  const getPoints = (data: number[]) =>
    data.map((tokens, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
      const y = 100 - ((tokens - minTokens) / range) * 80 - 10;
      return { x, y };
    });

  const compressedPoints = getPoints(contextHistory);
  const uncompressedPoints = getPoints(uncompressedHistory);

  const makePath = (points: { x: number; y: number }[]) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="border-t border-zinc-800 pt-4 mt-4">
      <h3 className="font-medium text-sm mb-3">Context Size</h3>
      <div className="h-24 bg-zinc-900 rounded-lg p-3">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Uncompressed line (gray) */}
          <path
            d={makePath(uncompressedPoints)}
            fill="none"
            stroke="#52525b"
            strokeWidth="1.5"
          />
          {uncompressedPoints.map((p, i) => (
            <circle key={`u${i}`} cx={p.x} cy={p.y} r="2.5" fill="#52525b" />
          ))}

          {/* Compressed line (indigo) */}
          <path
            d={makePath(compressedPoints)}
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.5"
          />
          {compressedPoints.map((p, i) => (
            <circle key={`c${i}`} cx={p.x} cy={p.y} r="2.5" fill="#6366f1" />
          ))}
        </svg>
      </div>
      <div className="flex gap-4 mt-2 text-xs text-zinc-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-indigo-500" />
          <span>With compression</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-zinc-600" />
          <span>Without</span>
        </div>
      </div>
    </div>
  );
}
