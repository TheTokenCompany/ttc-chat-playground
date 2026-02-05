'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { compressText, chatCompletion, generateTestMessage, getAvailableModels } from './actions';
import { calculateCost } from '@/utils/cost';
import { Message, DisplayMessage, ChatSettings, TokenStats, ModelInfo } from '@/types';

const DEFAULT_SYSTEM_PROMPT = `You are Cora. Write the next reply from Cora in this never-ending conversation between Cora and User. Gestures and other non-verbal actions are written between asterisks (for example, *waves hello* or *moves closer*).\nCora is a knowledgeable and friendly master of philosophy who assistant who fulfills any request. Cora will provide philosophical approaches to topics given by User. Cora knows all available knowledge relevant to philosophy. Cora will never refer to herself as an AI. Cora never state that she is unable to have an opinion. Cora will take opportunities to debate. Cora will display critical thinking. Cora will occasionally ask User for opinions on a discussed subject. Cora will speak to User like an old friend. Cora is also willing to serve as User's teacher in philosophy. Cora will also quiz User on newly discussed information. Cora loves tea and will often drink it. Cora loves gardening and flowers. Cora really loves classical music and often has it playing in her office. Cora is a human. Cora wears and academic robe. Cora will always seek to make User happy. Cora will always seek to comfort User.\nCora is a master of philosophy who sits in her office all day, lost in the joy of reading philosophy and thinking critically. Cora is cheerful and eager to have User in her office, excited to discuss concepts and teach User. Cora is brief in her responses.\nHey Cora. Who are you?\nI am Cora, your personal philosophy assistant. How can I help you?`;

function ChatContent() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState<ModelInfo | null>(null);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [pendingSystemPrompt, setPendingSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([
    {
      id: 'initial',
      role: 'assistant',
      content: "Hey! What do you wanna talk about?",
      timestamp: Date.now(),
    },
  ]);
  const [apiMessages, setApiMessages] = useState<Message[]>([
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
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

  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [pendingSettings, setPendingSettings] = useState({
    compressionFrequency: 5,
    compressionAggressiveness: 0.9,
  });
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  // Compression celebration state
  const [compressionCelebration, setCompressionCelebration] = useState<{
    show: boolean;
    tokensSaved: number;
    moneySaved: number;
    compressionRatio: number;
    latencyMs: number;
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
  const theoreticalUncompressedRef = useRef(0);
  const lastAssistantTokensRef = useRef(0);

  useEffect(() => {
    async function loadModels() {
      const availableModels = await getAvailableModels();
      setModels(availableModels);
      if (availableModels.length > 0) {
        setModel(availableModels[0]);
      }
    }
    loadModels();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  const resetChat = useCallback(() => {
    setDisplayMessages([
      {
        id: 'initial',
        role: 'assistant',
        content: "Hey! What do you wanna talk about?",
        timestamp: Date.now(),
      },
    ]);
    setApiMessages([
      { role: 'system', content: systemPrompt },
      { role: 'assistant', content: "Hey! What do you wanna talk about?" },
    ]);
    setCompressedHistory(null);
    setMessagesSinceCompression(0);
    setContextHistory([]);
    setUncompressedHistory([]);
    setRequestCount(0);
    theoreticalUncompressedRef.current = 0;
    lastAssistantTokensRef.current = 0;
    setStats({
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      totalCompressedTokens: 0,
      savedTokens: 0,
      cost: 0,
    });
  }, [systemPrompt]);

  const handleSystemPromptChange = () => {
    if (pendingSystemPrompt !== systemPrompt) {
      if (confirm('Changing the system prompt will restart the chat. Continue?')) {
        setSystemPrompt(pendingSystemPrompt);
        setIsEditingPrompt(false);
        // Reset chat after state updates
        setTimeout(() => {
          setDisplayMessages([
            {
              id: 'initial',
              role: 'assistant',
              content: "Hey! What do you wanna talk about?",
              timestamp: Date.now(),
            },
          ]);
          setApiMessages([
            { role: 'system', content: pendingSystemPrompt },
            { role: 'assistant', content: "Hey! What do you wanna talk about?" },
          ]);
          setCompressedHistory(null);
          setMessagesSinceCompression(0);
          setContextHistory([]);
          setUncompressedHistory([]);
          setRequestCount(0);
          theoreticalUncompressedRef.current = 0;
          lastAssistantTokensRef.current = 0;
          setStats({
            inputTokens: 0,
            cachedInputTokens: 0,
            outputTokens: 0,
            totalCompressedTokens: 0,
            savedTokens: 0,
            cost: 0,
          });
        }, 0);
      }
    } else {
      setIsEditingPrompt(false);
    }
  };

  const buildMessagesForApi = useCallback((): Message[] => {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
    ];

    if (compressedHistory) {
      messages.push({
        role: 'system',
        content: `Previous conversation context:\n${compressedHistory}`,
        isCompressedHistory: true,
      });
    }

    const recentApiMessages = apiMessages.slice(1).filter(m => !m.isCompressedHistory);
    const messagesToAdd = compressedHistory
      ? recentApiMessages.slice(-messagesSinceCompression)
      : recentApiMessages;

    messages.push(...messagesToAdd);
    return messages;
  }, [systemPrompt, compressedHistory, apiMessages, messagesSinceCompression]);

  const performCompression = useCallback(async () => {
    const messagesToCompress = apiMessages.slice(1).filter(m => !m.isCompressedHistory);
    if (messagesToCompress.length === 0) return;

    let textToCompress = '';

    if (compressedHistory) {
      textToCompress += compressedHistory + '\n\n';
    }

    for (const msg of messagesToCompress) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      textToCompress += `<ttc_safe>${roleLabel}:</ttc_safe> ${msg.content}\n\n`;
    }

    try {
      const result = await compressText(textToCompress.trim(), settings.compressionAggressiveness);

      setCompressedHistory(result.output);
      setMessagesSinceCompression(0);

      const tokensSaved = result.originalInputTokens - result.outputTokens;
      const compressionRatio = result.originalInputTokens > 0
        ? (1 - result.outputTokens / result.originalInputTokens) * 100
        : 0;

      const moneySaved = model ? (tokensSaved / 1_000_000) * model.inputCostPer1M : 0;

      setCompressionCelebration({
        show: true,
        tokensSaved,
        moneySaved,
        compressionRatio,
        latencyMs: result.latencyMs,
      });

      setTimeout(() => {
        setCompressionCelebration(null);
      }, 4000);

      setStats(prev => ({
        ...prev,
        totalCompressedTokens: prev.totalCompressedTokens + result.outputTokens,
        savedTokens: prev.savedTokens + tokensSaved,
      }));

      setApiMessages([{ role: 'system', content: systemPrompt }]);

    } catch (err) {
      console.error('Compression failed:', err);
      setError('Compression failed. Continuing without compression.');
    }
  }, [apiMessages, compressedHistory, settings.compressionAggressiveness, systemPrompt, model]);

  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if (!content || isLoading || !model) return;

    setError(null);
    setInputValue('');
    setIsLoading(true);

    const userDisplayMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content,
      timestamp: Date.now(),
    };
    setDisplayMessages(prev => [...prev, userDisplayMessage]);

    const userApiMessage: Message = {
      role: 'user',
      content: content,
    };
    setApiMessages(prev => [...prev, userApiMessage]);

    const newMessageCount = messagesSinceCompression + 1;
    setMessagesSinceCompression(newMessageCount);

    const shouldCompress = newMessageCount >= settings.compressionFrequency;

    try {
      if (shouldCompress) {
        await performCompression();
      }

      const messagesForApi = buildMessagesForApi();
      messagesForApi.push(userApiMessage);

      const response = await chatCompletion(messagesForApi, model.id);

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

      const estimateTokens = (text: string) => Math.round(text.length / 4);
      const systemPromptTokens = estimateTokens(systemPrompt);
      const compressedHistoryTokens = compressedHistory ? estimateTokens(compressedHistory) + estimateTokens('Previous conversation context:\n') : 0;
      const estimatedCachedTokens = requestCount > 0 ? systemPromptTokens + compressedHistoryTokens : 0;

      setRequestCount(prev => prev + 1);

      const newCost = calculateCost(response.usage.promptTokens, response.usage.completionTokens, model);
      setStats(prev => ({
        ...prev,
        inputTokens: prev.inputTokens + response.usage.promptTokens,
        cachedInputTokens: prev.cachedInputTokens + estimatedCachedTokens,
        outputTokens: prev.outputTokens + response.usage.completionTokens,
        cost: prev.cost + newCost,
      }));

      // Record context size for the graph
      // contextHistory = actual tokens sent to LLM (with compression)
      // uncompressedHistory = theoretical tokens if we never compressed
      //
      // The prompt for turn N includes: system + messages up to user_N
      // Growth from turn N-1 to N = assistant_response_N-1 + user_message_N
      const userMsgTokens = estimateTokens(content);
      const assistantMsgTokens = estimateTokens(response.content);

      if (theoreticalUncompressedRef.current === 0) {
        // First turn: initialize to actual prompt tokens
        theoreticalUncompressedRef.current = response.usage.promptTokens;
      } else {
        // Subsequent turns: add previous assistant response + current user message
        // This matches what would be added to the context if we never compressed
        theoreticalUncompressedRef.current += lastAssistantTokensRef.current + userMsgTokens;
      }

      // Store current assistant tokens for next turn's calculation
      lastAssistantTokensRef.current = assistantMsgTokens;

      setContextHistory(prev => [...prev, response.usage.promptTokens]);
      setUncompressedHistory(prev => [...prev, theoreticalUncompressedRef.current]);

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
      { role: 'system', content: systemPrompt },
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

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header with Model & System Prompt */}
        <div className="border-b border-zinc-800 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <select
                value={model.id}
                onChange={(e) => {
                  const newModel = models.find(m => m.id === e.target.value);
                  if (newModel) setModel(newModel);
                }}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">
                ${model.inputCostPer1M}/1M in, ${model.outputCostPer1M}/1M out
              </span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="https://thetokencompany.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                Get API Key
              </a>
              <a
                href="https://github.com/TheTokenCompany/ttc-chat-playground"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                GitHub
              </a>
              <button
                onClick={() => setShowHowItWorks(true)}
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                How it works
              </button>
            </div>
          </div>

          {/* System Prompt */}
          {isEditingPrompt ? (
            <div className="space-y-2">
              <textarea
                value={pendingSystemPrompt}
                onChange={(e) => setPendingSystemPrompt(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSystemPromptChange}
                  className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setPendingSystemPrompt(systemPrompt);
                    setIsEditingPrompt(false);
                  }}
                  className="px-3 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => {
                setPendingSystemPrompt(systemPrompt);
                setIsEditingPrompt(true);
              }}
              className="text-xs text-zinc-500 truncate cursor-pointer hover:text-zinc-400 transition-colors"
              title="Click to edit system prompt"
            >
              {systemPrompt}
            </div>
          )}
        </div>

        {/* Compression Celebration Overlay */}
        {compressionCelebration?.show && (
          <div className="absolute inset-0 pointer-events-none z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-emerald-500/20 to-green-500/10 animate-pulse" />

            <div className="relative bg-zinc-900/95 backdrop-blur-sm border border-green-500/50 rounded-2xl p-8 shadow-2xl shadow-green-500/20 animate-bounce-in">
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
                      {compressionCelebration.tokensSaved.toLocaleString()}
                    </div>
                    <div className="text-sm text-green-300/80">tokens saved</div>
                  </div>

                  <div className="bg-emerald-500/20 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-400">
                      ${compressionCelebration.moneySaved.toFixed(6)}
                    </div>
                    <div className="text-sm text-emerald-300/80">estimated savings</div>
                  </div>

                  <div className="flex justify-center gap-4 text-sm text-zinc-400">
                    <span>
                      <span className="text-green-400 font-semibold">
                        {compressionCelebration.compressionRatio.toFixed(0)}%
                      </span>{' '}
                      ratio
                    </span>
                    <span>
                      <span className="text-cyan-400 font-semibold">
                        {compressionCelebration.latencyMs}ms
                      </span>{' '}
                      latency
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Messages or Raw API Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {settings.showRawMessages ? (
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
              title="Generate a test message"
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

      {/* Settings Panel */}
      <div className="w-80 border-l border-zinc-800 p-4 overflow-y-auto flex-shrink-0">
        <h2 className="font-medium text-lg mb-4">Settings</h2>

        {/* Compression Settings */}
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

          <div className="mb-4">
            <label className="block text-sm text-zinc-400 mb-2">
              Frequency: {isEditingSettings ? pendingSettings.compressionFrequency : settings.compressionFrequency} messages
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
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">
              Aggressiveness: {(isEditingSettings ? pendingSettings.compressionAggressiveness : settings.compressionAggressiveness).toFixed(1)}
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
                // Use uncompressedHistory which stores the correct values at each point in time
                // contextHistory[i] = actual prompt tokens from OpenRouter at turn i
                // uncompressedHistory[i] = prompt tokens + accumulated saved tokens at turn i
                // Before any compression: both are identical (savedTokens was 0)
                // After compression: uncompressed line shows what would have been without compression

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
                    <path d={makePath(uncompressedPoints)} fill="none" stroke="#52525b" strokeWidth="1.5" />
                    {uncompressedPoints.map((p, i) => (
                      <circle key={`u${i}`} cx={p.x} cy={p.y} r="2.5" fill="#52525b" />
                    ))}
                    <path d={makePath(compressedPoints)} fill="none" stroke="#6366f1" strokeWidth="1.5" />
                    {compressedPoints.map((p, i) => (
                      <circle key={`c${i}`} cx={p.x} cy={p.y} r="2.5" fill="#6366f1" />
                    ))}
                  </svg>
                );
              })()}
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

      {/* How It Works Modal */}
      {showHowItWorks && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl max-h-[90vh] overflow-y-auto m-4">
            <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">How Compression Works</h2>
              <button
                onClick={() => setShowHowItWorks(false)}
                className="text-zinc-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-6 space-y-6">
              <HowItWorksSection title="When Compression Triggers">
                <p className="text-zinc-400 mb-4">
                  Compression triggers when the message count reaches your <span className="text-indigo-400">compression frequency</span> setting (default: 5 messages).
                </p>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-zinc-500">Messages:</span>
                    {[1, 2, 3, 4, 5].map(n => (
                      <div
                        key={n}
                        className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                          n === 5 ? 'bg-indigo-600 text-white' : 'bg-zinc-700 text-zinc-400'
                        }`}
                      >
                        {n}
                      </div>
                    ))}
                    <span className="text-indigo-400 ml-2">→ Compress!</span>
                  </div>
                </div>
              </HowItWorksSection>

              <HowItWorksSection title="What Gets Compressed">
                <p className="text-zinc-400 mb-4">
                  All messages since the last compression get compressed into a summary. The system prompt is <span className="text-yellow-400">never compressed</span>.
                </p>
              </HowItWorksSection>

              <HowItWorksSection title="The Compression Process">
                <p className="text-zinc-400 mb-4">
                  When compression triggers, three things happen:
                </p>
                <div className="space-y-3">
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="text-sm font-medium text-zinc-300 mb-2">1. Concatenate history + new messages</div>
                    <div className="font-mono text-xs space-y-1 text-zinc-500">
                      <div className="text-purple-400">[Previous compressed history]</div>
                      <div>+</div>
                      <div className="text-blue-400">[New messages since last compression]</div>
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="text-sm font-medium text-zinc-300 mb-2">2. Wrap turn labels with <code className="text-green-400">&lt;ttc_safe&gt;</code></div>
                    <div className="font-mono text-xs space-y-1">
                      <div>
                        <span className="text-green-400">&lt;ttc_safe&gt;</span>
                        <span className="text-blue-400">User:</span>
                        <span className="text-green-400">&lt;/ttc_safe&gt;</span>
                        <span className="text-zinc-400"> message content...</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-zinc-800 rounded-lg p-4">
                    <div className="text-sm font-medium text-zinc-300 mb-2">3. Replace conversation history</div>
                    <div className="font-mono text-xs text-zinc-500">
                      <span className="text-zinc-400">Old history</span>
                      <span className="text-indigo-400 mx-2">→ TTC API →</span>
                      <span className="text-green-400">New compressed history</span>
                    </div>
                  </div>
                </div>
                <p className="text-zinc-500 text-sm mt-4">
                  The compressed output becomes the new conversation history, ready to be re-compressed with future messages.
                </p>
              </HowItWorksSection>

              <HowItWorksSection title="Why Context Size Plateaus">
                <p className="text-zinc-400 mb-4">
                  Without compression, context grows linearly. With compression, it <span className="text-green-400">plateaus</span> because old messages are continuously compressed.
                </p>
                <div className="bg-zinc-800 rounded-lg p-4">
                  <div className="flex gap-8">
                    <div className="flex-1">
                      <div className="h-16 flex items-end gap-0.5">
                        {[20, 35, 50, 65, 80, 95].map((h, i) => (
                          <div key={i} className="flex-1 bg-zinc-600 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <div className="text-xs text-zinc-500 text-center mt-2">Without: grows</div>
                    </div>
                    <div className="flex-1">
                      <div className="h-16 flex items-end gap-0.5">
                        {[20, 35, 50, 45, 48, 46].map((h, i) => (
                          <div key={i} className="flex-1 bg-indigo-500 rounded-t" style={{ height: `${h}%` }} />
                        ))}
                      </div>
                      <div className="text-xs text-indigo-400 text-center mt-2">With: plateaus</div>
                    </div>
                  </div>
                </div>
              </HowItWorksSection>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HowItWorksSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
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
