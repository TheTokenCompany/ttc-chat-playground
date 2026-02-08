import { TokenStats, ModelInfo } from '@/types';
import { CloseIcon } from './Icons';
import { ContextSizeGraph } from './ContextSizeGraph';

interface SettingsPanelProps {
  showMobile: boolean;
  onCloseMobile: () => void;
  // Compression settings
  compressionFrequency: number;
  compressionAggressiveness: number;
  isEditingSettings: boolean;
  pendingFrequency: number;
  pendingAggressiveness: number;
  onEditSettings: () => void;
  onSaveSettings: () => void;
  onCancelSettings: () => void;
  onPendingFrequencyChange: (value: number) => void;
  onPendingAggressivenessChange: (value: number) => void;
  // Raw messages toggle
  showRawMessages: boolean;
  onShowRawMessagesChange: (value: boolean) => void;
  // Graph data
  contextHistory: number[];
  uncompressedHistory: number[];
  // Stats
  stats: TokenStats;
  model: ModelInfo;
  // Compression status
  messagesSinceCompression: number;
}

export function SettingsPanel({
  showMobile,
  onCloseMobile,
  compressionFrequency,
  compressionAggressiveness,
  isEditingSettings,
  pendingFrequency,
  pendingAggressiveness,
  onEditSettings,
  onSaveSettings,
  onCancelSettings,
  onPendingFrequencyChange,
  onPendingAggressivenessChange,
  showRawMessages,
  onShowRawMessagesChange,
  contextHistory,
  uncompressedHistory,
  stats,
  model,
  messagesSinceCompression,
}: SettingsPanelProps) {
  return (
    <>
      {/* Mobile backdrop */}
      {showMobile && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={onCloseMobile}
        />
      )}

      {/* Panel */}
      <div
        className={`
          fixed lg:relative inset-y-0 right-0 z-50
          w-80 max-w-[85vw] border-l border-zinc-800 p-4 overflow-y-auto flex-shrink-0 bg-zinc-950
          transform transition-transform duration-300 ease-in-out
          ${showMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium text-lg">Settings</h2>
          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1 text-zinc-400 hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Compression Settings */}
        <CompressionSettings
          frequency={compressionFrequency}
          aggressiveness={compressionAggressiveness}
          isEditing={isEditingSettings}
          pendingFrequency={pendingFrequency}
          pendingAggressiveness={pendingAggressiveness}
          onEdit={onEditSettings}
          onSave={onSaveSettings}
          onCancel={onCancelSettings}
          onFrequencyChange={onPendingFrequencyChange}
          onAggressivenessChange={onPendingAggressivenessChange}
        />

        {/* Show Raw Messages Toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRawMessages}
              onChange={(e) => onShowRawMessagesChange(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
            />
            <span className="text-sm text-zinc-300">Show raw API messages</span>
          </label>
        </div>

        {/* Context Size Graph */}
        <ContextSizeGraph
          contextHistory={contextHistory}
          uncompressedHistory={uncompressedHistory}
        />

        {/* Token Statistics */}
        <TokenStatistics stats={stats} model={model} />

        {/* Compression Status */}
        <CompressionStatus
          messagesSinceCompression={messagesSinceCompression}
          compressionFrequency={compressionFrequency}
        />
      </div>
    </>
  );
}

function CompressionSettings({
  frequency,
  aggressiveness,
  isEditing,
  pendingFrequency,
  pendingAggressiveness,
  onEdit,
  onSave,
  onCancel,
  onFrequencyChange,
  onAggressivenessChange,
}: {
  frequency: number;
  aggressiveness: number;
  isEditing: boolean;
  pendingFrequency: number;
  pendingAggressiveness: number;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onFrequencyChange: (value: number) => void;
  onAggressivenessChange: (value: number) => void;
}) {
  return (
    <div className="mb-6 p-3 bg-zinc-900 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-zinc-300">Compression Settings</span>
        {!isEditing ? (
          <button
            onClick={onEdit}
            className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
            >
              Save
            </button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="block text-sm text-zinc-400 mb-2">
          Frequency: {isEditing ? pendingFrequency : frequency} messages
        </label>
        <input
          type="range"
          min="5"
          max="15"
          value={isEditing ? pendingFrequency : frequency}
          onChange={(e) => onFrequencyChange(parseInt(e.target.value))}
          disabled={!isEditing}
          className={`w-full ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>

      <div>
        <label className="block text-sm text-zinc-400 mb-2">
          Aggressiveness: {(isEditing ? pendingAggressiveness : aggressiveness).toFixed(1)}
        </label>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.1"
          value={isEditing ? pendingAggressiveness : aggressiveness}
          onChange={(e) => onAggressivenessChange(parseFloat(e.target.value))}
          disabled={!isEditing}
          className={`w-full ${!isEditing ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      </div>
    </div>
  );
}

function TokenStatistics({ stats, model }: { stats: TokenStats; model: ModelInfo }) {
  const hasCaching = model.cachedInputCostPer1M != null;
  const cacheSavingsPercent = hasCaching && stats.cachedInputTokens > 0 && stats.inputTokens > 0
    ? ((stats.cachedInputTokens / stats.inputTokens) *
       (1 - model.cachedInputCostPer1M! / model.inputCostPer1M) * 100)
    : 0;

  return (
    <div className="border-t border-zinc-800 pt-4 mt-4">
      <h3 className="font-medium text-sm mb-3">Token Statistics</h3>
      <div className="space-y-2 text-sm">
        <StatRow label="Input Tokens" value={stats.inputTokens.toLocaleString()} />
        <StatRow label="Output Tokens" value={stats.outputTokens.toLocaleString()} />
        {hasCaching && stats.inputTokens > 0 && (
          <StatRow
            label="Est. Cache Savings"
            value={
              cacheSavingsPercent > 0
                ? `~${cacheSavingsPercent.toFixed(1)}%`
                : '0%'
            }
            valueClassName={cacheSavingsPercent > 0 ? 'text-cyan-400' : 'text-zinc-500'}
          />
        )}
        <StatRow label="Compressed To" value={stats.totalCompressedTokens.toLocaleString()} />
        <StatRow
          label="Tokens Saved"
          value={stats.savedTokens.toLocaleString()}
          className="text-green-400"
        />
        <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2">
          <span className="text-zinc-400">Total Cost:</span>
          <span>${stats.cost.toFixed(6)}</span>
        </div>
        {hasCaching && stats.inputTokens > 0 && (
          <div className="text-[11px] text-zinc-500 mt-1">
            * Assuming prompt prefix caching
          </div>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`flex justify-between ${className || ''}`}>
      <span className={className ? undefined : 'text-zinc-400'}>{label}:</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

function CompressionStatus({
  messagesSinceCompression,
  compressionFrequency,
}: {
  messagesSinceCompression: number;
  compressionFrequency: number;
}) {
  const progress = (messagesSinceCompression / compressionFrequency) * 100;

  return (
    <div className="border-t border-zinc-800 pt-4 mt-4">
      <h3 className="font-medium text-sm mb-3">Compression Status</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-zinc-400">Messages since last:</span>
          <span>{messagesSinceCompression}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-zinc-400">Next compression at:</span>
          <span>{compressionFrequency}</span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
