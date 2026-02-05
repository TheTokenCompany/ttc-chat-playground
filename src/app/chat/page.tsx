'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { compressText, chatCompletion, generateTestMessage, getAvailableModels, testTtcApiKey } from '../actions';
import { calculateCost } from '@/utils/cost';
import { Message, DisplayMessage, ChatSettings, TokenStats, ModelInfo } from '@/types';

function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const modelId = searchParams.get('model') || '';
  const initialSystemPrompt = searchParams.get('systemPrompt') || 'You are a helpful AI assistant. Keep responses SHORT (2-3 sentences max).';

  const [model, setModel] = useState<ModelInfo | null>(null);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "Hey! What do you wanna talk about?",
      timestamp: Date.now(),
    },
  ]);
  const [apiMessages, setApiMessages] = useState<Message[]>([
    { role: 'system', content: initialSystemPrompt },
    { role: 'assistant', content: "Hey! What do you wanna talk about?" },
  ]);
  const [compressedHistory, setCompressedHistory] = useState<string | null>(null);
  const [messagesSinceCompression, setMessagesSinceCompression] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<ChatSettings>({
    compressionFrequency: 5,
    compressionAggressiveness: 0.9,
    showRawMessages: false,
    ttcApiKey: '',
  });

  const [showApiKeyModal, setShowApiKeyModal] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeyValidating, setApiKeyValidating] = useState(false);
  const [apiKeyError, setApiKeyError] = useState<string | null>(null);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [pendingSettings, setPendingSettings] = useState({
    compressionFrequency: 5,
    compressionAggressiveness: 0.9,
  });

  // Compression celebration state
  const [compressionCelebration, setCompressionCelebration] = useState<{
    show: boolean;
    tokensSaved: number;
    moneySaved: number;
    compressionRatio: number;
  } | null>(null);

  const [stats, setStats] = useState<TokenStats>({
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    totalCompressedTokens: 0,
    savedTokens: 0,
    cost: 0,
  });

  const [contextHistory, setContextHistory] = useState<number[]>([]);
  const [uncompressedHistory, setUncompressedHistory] = useState<number[]>([]);
  const [requestCount, setRequestCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    async function loadModel() {
      const models = await getAvailableModels();
      const found = models.find(m => m.id === modelId);
      if (found) {
        setModel(found);
      } else if (models.length > 0) {
        setModel(models[0]);
      }
    }
    loadModel();
  }, [modelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const buildMessagesForApi = useCallback((): Message[] => {
    const messages: Message[] = [
      { role: 'system', content: initialSystemPrompt },
    ];

    if (compressedHistory) {
      messages.push({
        role: 'system',
        content: `Previous conversation context:\n${compressedHistory}`,
        isCompressedHistory: true,
      });
    }

    // Add recent messages (those since last compression)
    const recentApiMessages = apiMessages.slice(1).filter(m => !m.isCompressedHistory);
    const messagesToAdd = compressedHistory
      ? recentApiMessages.slice(-messagesSinceCompression)
      : recentApiMessages;

    messages.push(...messagesToAdd);
    return messages;
  }, [initialSystemPrompt, compressedHistory, apiMessages, messagesSinceCompression]);

  const performCompression = useCallback(async () => {
    const messagesToCompress = apiMessages.slice(1).filter(m => !m.isCompressedHistory);
    if (messagesToCompress.length === 0) return;

    // Format messages for compression with ttc_safe labels for new messages
    let textToCompress = '';

    if (compressedHistory) {
      textToCompress += compressedHistory + '\n\n';
    }

    // Add new messages with protected turn labels
    for (const msg of messagesToCompress) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      textToCompress += `<ttc_safe>${roleLabel}:</ttc_safe> ${msg.content}\n\n`;
    }

    try {
      const result = await compressText(textToCompress.trim(), settings.compressionAggressiveness, settings.ttcApiKey);

      setCompressedHistory(result.output);
      setMessagesSinceCompression(0);

      const tokensSaved = result.originalInputTokens - result.outputTokens;
      const compressionRatio = result.originalInputTokens > 0
        ? (1 - result.outputTokens / result.originalInputTokens) * 100
        : 0;

      // Estimate money saved based on current model's input cost
      const moneySaved = model ? (tokensSaved / 1_000_000) * model.inputCostPer1M : 0;

      // Show celebration
      setCompressionCelebration({
        show: true,
        tokensSaved,
        moneySaved,
        compressionRatio,
      });

      // Auto-hide celebration after 4 seconds
      setTimeout(() => {
        setCompressionCelebration(null);
      }, 4000);

      // Update stats
      setStats(prev => ({
        ...prev,
        totalCompressedTokens: prev.totalCompressedTokens + result.outputTokens,
        savedTokens: prev.savedTokens + tokensSaved,
      }));

      // Clear the API messages except system prompt
      setApiMessages([{ role: 'system', content: initialSystemPrompt }]);

    } catch (err) {
      console.error('Compression failed:', err);
      setError('Compression failed. Continuing without compression.');
    }
  }, [apiMessages, compressedHistory, settings.compressionAggressiveness, settings.ttcApiKey, initialSystemPrompt, model]);

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if (!content || isLoading || !model) return;

    setError(null);
    setInputValue('');
    setIsLoading(true);

    // Add user message to display
    const userDisplayMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: Date.now(),
    };
    setDisplayMessages(prev => [...prev, userDisplayMessage]);

    // Add user message to API messages
    const userApiMessage: Message = {
      role: 'user',
      content: content,
    };
    setApiMessages(prev => [...prev, userApiMessage]);

    const newMessageCount = messagesSinceCompression + 1;
    setMessagesSinceCompression(newMessageCount);

    // Check if we need to compress before sending
    const shouldCompress = newMessageCount >= settings.compressionFrequency;

    try {
      if (shouldCompress) {
        await performCompression();
      }

      // Build messages for API
      const messagesForApi = buildMessagesForApi();
      messagesForApi.push(userApiMessage);

      // Call LLM
      const response = await chatCompletion(messagesForApi, model.id);

      // Add assistant response
      const assistantDisplayMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };
      setDisplayMessages(prev => [...prev, assistantDisplayMessage]);

      const assistantApiMessage: Message = {
        role: 'assistant',
        content: response.content,
      };
      setApiMessages(prev => [...prev, assistantApiMessage]);
      setMessagesSinceCompression(prev => prev + 1);

      // Estimate cached tokens based on stable prefix (system prompt + compressed history)
      // LLM caching works by caching the prefix - after first request, the stable prefix is cached
      // Rough estimate: ~4 characters per token
      const estimateTokens = (text: string) => Math.round(text.length / 4);

      const systemPromptTokens = estimateTokens(initialSystemPrompt);
      const compressedHistoryTokens = compressedHistory ? estimateTokens(compressedHistory) + estimateTokens('Previous conversation context:\n') : 0;

      // First request has no cache, subsequent requests cache the stable prefix
      const estimatedCachedTokens = requestCount > 0 ? systemPromptTokens + compressedHistoryTokens : 0;

      setRequestCount(prev => prev + 1);

      // Update stats
      const newCost = calculateCost(response.usage.promptTokens, response.usage.completionTokens, model);
      setStats(prev => ({
        ...prev,
        inputTokens: prev.inputTokens + response.usage.promptTokens,
        cachedInputTokens: prev.cachedInputTokens + estimatedCachedTokens,
        outputTokens: prev.outputTokens + response.usage.completionTokens,
        cost: prev.cost + newCost,
      }));

      // Track context size for graph
      setContextHistory(prev => [...prev, response.usage.promptTokens]);

      // Track what context would be without compression (cumulative growth)
      setUncompressedHistory(prev => {
        const lastUncompressed = prev.length > 0 ? prev[prev.length - 1] : response.usage.promptTokens;
        // Estimate: previous uncompressed + new output tokens (assistant response adds to context)
        const growth = response.usage.completionTokens + 50; // +50 for avg user message
        return [...prev, prev.length === 0 ? response.usage.promptTokens : lastUncompressed + growth];
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTestMessage = async () => {
    if (isGeneratingTest || !model) return;

    const lastAssistantMessage = displayMessages
      .filter(m => m.role === 'assistant')
      .pop()?.content || 'Hello! How can I help you today?';

    setIsGeneratingTest(true);

    try {
      const testMessage = await generateTestMessage(lastAssistantMessage, model.id);
      setInputValue(testMessage);
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate test message');
    } finally {
      setIsGeneratingTest(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getRawMessages = (): Message[] => {
    const messages: Message[] = [
      { role: 'system', content: initialSystemPrompt },
    ];

    if (compressedHistory) {
      messages.push({
        role: 'system',
        content: `Previous conversation context:\n${compressedHistory}`,
        isCompressedHistory: true,
      });
    }

    const recentMessages = apiMessages.slice(1).filter(m => !m.isCompressedHistory);
    messages.push(...recentMessages);

    return messages;
  };

  const handleApiKeySubmit = async () => {
    const key = apiKeyInput.trim();
    if (!key) return;

    setApiKeyValidating(true);
    setApiKeyError(null);

    const result = await testTtcApiKey(key);

    if (result.valid) {
      setSettings(prev => ({ ...prev, ttcApiKey: key }));
      setShowApiKeyModal(false);
    } else {
      setApiKeyError(result.error || 'Invalid API key');
    }

    setApiKeyValidating(false);
  };

  const handleEditSettings = () => {
    setPendingSettings({
      compressionFrequency: settings.compressionFrequency,
      compressionAggressiveness: settings.compressionAggressiveness,
    });
    setIsEditingSettings(true);
  };

  const handleSaveSettings = () => {
    setSettings(prev => ({
      ...prev,
      compressionFrequency: pendingSettings.compressionFrequency,
      compressionAggressiveness: pendingSettings.compressionAggressiveness,
    }));
    setIsEditingSettings(false);
  };

  const handleCancelEditSettings = () => {
    setIsEditingSettings(false);
  };

  if (!model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  // API Key Modal
  if (showApiKeyModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full mx-4">
          <h2 className="text-xl font-semibold mb-2">Enter TTC API Key</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Please enter your Token Company API key to enable context compression.
            You can get one at{' '}
            <a
              href="https://thetokencompany.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              thetokencompany.com
            </a>
          </p>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => {
              setApiKeyInput(e.target.value);
              setApiKeyError(null);
            }}
            onKeyDown={(e) => e.key === 'Enter' && !apiKeyValidating && handleApiKeySubmit()}
            placeholder="ttc_..."
            className={`w-full bg-zinc-800 border rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2 ${
              apiKeyError ? 'border-red-500' : 'border-zinc-700'
            }`}
            autoFocus
            disabled={apiKeyValidating}
          />
          {apiKeyError && (
            <p className="text-red-400 text-sm mb-2">{apiKeyError}</p>
          )}
          <button
            onClick={handleApiKeySubmit}
            disabled={!apiKeyInput.trim() || apiKeyValidating}
            className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium mt-2"
          >
            {apiKeyValidating ? 'Validating...' : 'Continue to Chat'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Chat Area / Raw Messages Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-zinc-400 hover:text-white transition-colors"
            >
              ← Back
            </Link>
            <h1 className="font-medium">Chat with {model.name}</h1>
          </div>
          <Link
            href="/how-it-works"
            className="text-sm text-indigo-400 hover:text-indigo-300"
          >
            How it works
          </Link>
        </div>

        {/* Compression Celebration Overlay */}
        {compressionCelebration?.show && (
          <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
            {/* Animated background glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/20 to-green-500/10 animate-pulse" />

            {/* Celebration card */}
            <div className="relative bg-zinc-900/95 backdrop-blur-sm border border-green-500/50 rounded-2xl p-8 shadow-2xl shadow-green-500/20 animate-bounce-in">
              {/* Sparkle effects */}
              <div className="absolute -top-2 -left-2 w-4 h-4 bg-green-400 rounded-full animate-ping" />
              <div className="absolute -top-1 -right-3 w-3 h-3 bg-emerald-400 rounded-full animate-ping delay-100" />
              <div className="absolute -bottom-2 left-1/4 w-3 h-3 bg-green-300 rounded-full animate-ping delay-200" />
              <div className="absolute -bottom-1 -right-2 w-4 h-4 bg-emerald-300 rounded-full animate-ping delay-300" />

              <div className="text-center">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="text-xl font-bold text-green-400 mb-4">Context Compressed!</h3>

                <div className="space-y-3">
                  {/* Tokens saved */}
                  <div className="bg-green-500/20 rounded-lg p-3">
                    <div className="text-3xl font-bold text-green-400">
                      {compressionCelebration.tokensSaved.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-300/80">tokens saved</div>
                  </div>

                  {/* Money saved */}
                  <div className="bg-emerald-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-400">
                      ${compressionCelebration.moneySaved.toFixed(6)}
                    </div>
                    <div className="text-sm text-emerald-300/80">estimated savings</div>
                  </div>

                  {/* Compression ratio */}
                  <div className="text-sm text-zinc-400">
                    <span className="text-green-400 font-semibold">
                      {compressionCelebration.compressionRatio.toFixed(1)}%
                    </span>{' '}
                    compression ratio
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages or Raw API Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {settings.showRawMessages ? (
            // Raw API Messages View (replaces chat when toggled)
            <div className="space-y-3 font-mono text-sm">
              <h3 className="font-medium text-lg font-sans mb-4">Raw API Messages</h3>
              {getRawMessages().map((msg, i) => (
                <div key={i} className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
                  <div className={`font-bold mb-2 ${
                    msg.role === 'system'
                      ? msg.isCompressedHistory ? 'text-purple-400' : 'text-yellow-400'
                      : msg.role === 'user' ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {msg.role.toUpperCase()}
                    {msg.isCompressedHistory && ' (compressed history)'}
                  </div>
                  <div className="text-zinc-300 whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Regular Chat View
            <>
              {displayMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-800 text-zinc-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-lg px-4 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-zinc-500 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="px-4 py-2 bg-red-900/50 border-t border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Input */}
        <div className="border-t border-zinc-800 p-4">
          <div className="flex gap-2">
            <button
              onClick={handleGenerateTestMessage}
              disabled={isGeneratingTest || isLoading}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
              title="Generate a test message (not counted in stats)"
            >
              {isGeneratingTest ? '...' : '✨ AI Message'}
            </button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputValue.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel - always full height */}
      <div className="w-80 border-l border-zinc-800 p-4 overflow-y-auto flex-shrink-0">
        <h2 className="font-medium text-lg mb-4">Settings</h2>

        {/* Compression Settings with Edit/Save */}
        <div className="mb-6 p-3 bg-zinc-900 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-300">Compression Settings</span>
            {!isEditingSettings ? (
              <button
                onClick={handleEditSettings}
                className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
              >
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleCancelEditSettings}
                  className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {/* Compression Frequency */}
          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                Compression Frequency: {isEditingSettings ? pendingSettings.compressionFrequency : settings.compressionFrequency} messages
                <span className="relative group">
                  <svg className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
                  </svg>
                  <div className="absolute right-0 bottom-full mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                    How many messages to accumulate before compressing. Lower values compress more often, keeping context smaller but using more API calls.
                  </div>
                </span>
              </span>
            </label>
            <input
              type="range"
              min="5"
              max="15"
              value={isEditingSettings ? pendingSettings.compressionFrequency : settings.compressionFrequency}
              onChange={(e) => setPendingSettings(prev => ({
                ...prev,
                compressionFrequency: parseInt(e.target.value),
              }))}
              disabled={!isEditingSettings}
              className={`w-full ${!isEditingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>5</span>
              <span>15</span>
            </div>
          </div>

          {/* Compression Aggressiveness */}
          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              <span className="flex items-center gap-1.5">
                Compression Aggressiveness: {(isEditingSettings ? pendingSettings.compressionAggressiveness : settings.compressionAggressiveness).toFixed(1)}
                <span className="relative group">
                  <svg className="w-4 h-4 text-zinc-500 hover:text-zinc-300 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4M12 8h.01" />
                  </svg>
                  <div className="absolute right-0 bottom-full mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg">
                    How aggressively to compress the context. Higher values save more tokens but may lose some nuance. 0.5 is a balanced default.
                  </div>
                </span>
              </span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.9"
              step="0.1"
              value={isEditingSettings ? pendingSettings.compressionAggressiveness : settings.compressionAggressiveness}
              onChange={(e) => setPendingSettings(prev => ({
                ...prev,
                compressionAggressiveness: parseFloat(e.target.value),
              }))}
              disabled={!isEditingSettings}
              className={`w-full ${!isEditingSettings ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <div className="flex justify-between text-xs text-zinc-600 mt-1">
              <span>0.1 (Less)</span>
              <span>0.9 (More)</span>
            </div>
          </div>
        </div>

        {/* Show Raw Messages Toggle */}
        <div className="mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.showRawMessages}
              onChange={(e) => setSettings(prev => ({
                ...prev,
                showRawMessages: e.target.checked,
              }))}
              className="w-4 h-4 rounded bg-zinc-800 border-zinc-700"
            />
            <span className="text-sm text-zinc-300">Show raw API messages</span>
          </label>
        </div>

        {/* Context Size Graph */}
        {contextHistory.length > 0 && (
          <div className="border-t border-zinc-800 pt-4 mt-4">
            <h3 className="font-medium text-sm mb-3">Context Size</h3>
            <div className="h-24 bg-zinc-900 rounded-lg p-3">
              {(() => {
                const allValues = [...contextHistory, ...uncompressedHistory];
                const maxTokens = Math.max(...allValues, 1);
                const minTokens = Math.min(...allValues);
                const range = maxTokens - minTokens || 1;

                const getPoints = (data: number[]) => data.map((tokens, i) => {
                  const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 100;
                  const y = 100 - ((tokens - minTokens) / range) * 80 - 10;
                  return { x, y };
                });

                const compressedPoints = getPoints(contextHistory);
                const uncompressedPoints = getPoints(uncompressedHistory);

                const makePath = (points: {x: number, y: number}[]) =>
                  points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

                return (
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
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
                );
              })()}
            </div>
            {/* Legend */}
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
        )}

        {/* Stats */}
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <h3 className="font-medium text-sm mb-3">Token Statistics</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Input Tokens:</span>
              <span>{stats.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Output Tokens:</span>
              <span>{stats.outputTokens.toLocaleString()}</span>
            </div>
            {stats.inputTokens > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Est. Cache Rate:</span>
                <span className={stats.cachedInputTokens > 0 ? 'text-cyan-400' : 'text-zinc-500'}>
                  {stats.cachedInputTokens > 0
                    ? `~${((stats.cachedInputTokens / stats.inputTokens) * 100).toFixed(0)}%`
                    : '0%'}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-400">Compressed To:</span>
              <span>{stats.totalCompressedTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-green-400">
              <span>Tokens Saved:</span>
              <span>{stats.savedTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between border-t border-zinc-800 pt-2 mt-2">
              <span className="text-zinc-400">Total Cost:</span>
              <span>${stats.cost.toFixed(6)}</span>
            </div>
          </div>
        </div>

        {/* Compression Status */}
        <div className="border-t border-zinc-800 pt-4 mt-4">
          <h3 className="font-medium text-sm mb-3">Compression Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Messages since last:</span>
              <span>{messagesSinceCompression}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Next compression at:</span>
              <span>{settings.compressionFrequency}</span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2 mt-2">
              <div
                className="bg-indigo-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(messagesSinceCompression / settings.compressionFrequency) * 100}%`,
                }}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    }>
      <ChatContent />
    </Suspense>
  );
}
