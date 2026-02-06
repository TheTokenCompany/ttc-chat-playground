import { forwardRef } from 'react';
import { DisplayMessage, Message } from '@/types';

interface ChatMessagesProps {
  displayMessages: DisplayMessage[];
  rawMessages: Message[];
  showRawMessages: boolean;
  isLoading: boolean;
}

export const ChatMessages = forwardRef<HTMLDivElement, ChatMessagesProps>(
  function ChatMessages({ displayMessages, rawMessages, showRawMessages, isLoading }, ref) {
    if (showRawMessages) {
      return (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3 font-mono text-sm">
            <h3 className="font-medium text-lg font-sans mb-4">Raw API Messages</h3>
            {rawMessages.map((msg, i) => (
              <RawMessageCard key={i} message={msg} />
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {displayMessages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isLoading && <LoadingIndicator />}

        <div ref={ref} />
      </div>
    );
  }
);

function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] sm:max-w-[70%] rounded-lg px-3 sm:px-4 py-2 ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-100'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
      </div>
    </div>
  );
}

function RawMessageCard({ message }: { message: Message }) {
  const getRoleColor = () => {
    if (message.role === 'system') {
      return message.isCompressedHistory ? 'text-purple-400' : 'text-yellow-400';
    }
    return message.role === 'user' ? 'text-blue-400' : 'text-green-400';
  };

  return (
    <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
      <div className={`font-bold mb-2 ${getRoleColor()}`}>
        {message.role.toUpperCase()}
        {message.isCompressedHistory && ' (compressed history)'}
      </div>
      <div className="text-zinc-300 whitespace-pre-wrap break-words">
        {message.content}
      </div>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-zinc-800 rounded-lg px-4 py-2">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-100" />
          <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-200" />
        </div>
      </div>
    </div>
  );
}
