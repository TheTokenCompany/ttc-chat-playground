import { forwardRef } from 'react';

interface ChatInputProps {
  value: string;
  isLoading: boolean;
  isGeneratingTest: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
  onGenerateTest: () => void;
}

export const ChatInput = forwardRef<HTMLTextAreaElement, ChatInputProps>(
  function ChatInput(
    { value, isLoading, isGeneratingTest, onChange, onSend, onGenerateTest },
    ref
  ) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSend();
      }
    };

    return (
      <div className="border-t border-zinc-800 p-3 sm:p-4">
        <div className="flex gap-2">
          <button
            onClick={onGenerateTest}
            disabled={isGeneratingTest || isLoading}
            className="px-2 sm:px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
            title="Generate a test message"
          >
            {isGeneratingTest ? (
              '...'
            ) : (
              <>
                <span className="hidden sm:inline">✨ AI Message</span>
                <span className="sm:hidden">✨</span>
              </>
            )}
          </button>
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 sm:px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none min-w-0"
          />
          <button
            onClick={onSend}
            disabled={isLoading || !value.trim()}
            className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    );
  }
);
