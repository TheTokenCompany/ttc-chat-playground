import { ModelInfo } from '@/types';
import { SettingsIcon } from './Icons';

interface HeaderProps {
  model: ModelInfo;
  models: ModelInfo[];
  systemPrompt: string;
  pendingSystemPrompt: string;
  isEditingPrompt: boolean;
  onModelChange: (model: ModelInfo) => void;
  onShowHowItWorks: () => void;
  onShowMobileSettings: () => void;
  onEditPrompt: () => void;
  onSavePrompt: () => void;
  onCancelPrompt: () => void;
  onPendingPromptChange: (value: string) => void;
}

export function Header({
  model,
  models,
  systemPrompt,
  pendingSystemPrompt,
  isEditingPrompt,
  onModelChange,
  onShowHowItWorks,
  onShowMobileSettings,
  onEditPrompt,
  onSavePrompt,
  onCancelPrompt,
  onPendingPromptChange,
}: HeaderProps) {
  return (
    <div className="border-b border-zinc-800 p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <select
            value={model.id}
            onChange={(e) => {
              const newModel = models.find(m => m.id === e.target.value);
              if (newModel) onModelChange(newModel);
            }}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 sm:px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-0"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <span className="text-xs text-zinc-500 hidden sm:inline">
            ${model.inputCostPer1M}/1M in, ${model.outputCostPer1M}/1M out
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="https://thetokencompany.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors hidden sm:inline"
          >
            Get API Key
          </a>
          <a
            href="https://github.com/TheTokenCompany/ttc-chat-playground"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors hidden sm:inline"
          >
            GitHub
          </a>
          <button
            onClick={onShowHowItWorks}
            className="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300"
          >
            How it works
          </button>
          <button
            onClick={onShowMobileSettings}
            className="lg:hidden p-2 text-zinc-400 hover:text-white transition-colors"
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      </div>

      {/* System Prompt */}
      {isEditingPrompt ? (
        <div className="space-y-2">
          <textarea
            value={pendingSystemPrompt}
            onChange={(e) => onPendingPromptChange(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={onSavePrompt}
              className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
            >
              Save
            </button>
            <button
              onClick={onCancelPrompt}
              className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={onEditPrompt}
          className="text-xs text-zinc-500 truncate cursor-pointer hover:text-zinc-400 transition-colors"
          title="Click to edit system prompt"
        >
          {systemPrompt}
        </div>
      )}
    </div>
  );
}
