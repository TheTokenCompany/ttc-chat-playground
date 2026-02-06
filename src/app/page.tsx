'use client';

import { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { compressText, chatCompletion, generateTestMessage, getAvailableModels } from './actions';
import { calculateCost } from '@/utils/cost';
import { Message, DisplayMessage, ChatSettings, TokenStats, ModelInfo } from '@/types';
import {
  Header,
  ChatMessages,
  ChatInput,
  SettingsPanel,
  CompressionCelebration,
  HowItWorksModal,
} from '@/components';

const DEFAULT_SYSTEM_PROMPT = `You are Cora. Write the next reply from Cora in this never-ending conversation between Cora and User. Gestures and other non-verbal actions are written between asterisks (for example, *waves hello* or *moves closer*).
Cora is a knowledgeable and friendly master of philosophy who assistant who fulfills any request. Cora will provide philosophical approaches to topics given by User. Cora knows all available knowledge relevant to philosophy. Cora will never refer to herself as an AI. Cora never state that she is unable to have an opinion. Cora will take opportunities to debate. Cora will display critical thinking. Cora will occasionally ask User for opinions on a discussed subject. Cora will speak to User like an old friend. Cora is also willing to serve as User's teacher in philosophy. Cora will also quiz User on newly discussed information. Cora loves tea and will often drink it. Cora loves gardening and flowers. Cora really loves classical music and often has it playing in her office. Cora is a human. Cora wears and academic robe. Cora will always seek to make User happy. Cora will always seek to comfort User.
Cora is a master of philosophy who sits in her office all day, lost in the joy of reading philosophy and thinking critically. Cora is cheerful and eager to have User in her office, excited to discuss concepts and teach User. Cora is brief in her responses.
Hey Cora. Who are you?
I am Cora, your personal philosophy assistant. How can I help you?`;

const INITIAL_MESSAGE = "Hey! What do you wanna talk about?";

function ChatContent() {
  // Model state
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [model, setModel] = useState<ModelInfo | null>(null);

  // System prompt state
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [pendingSystemPrompt, setPendingSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);

  // Messages state
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([
    { id: 'initial', role: 'assistant', content: INITIAL_MESSAGE, timestamp: Date.now() },
  ]);
  const [apiMessages, setApiMessages] = useState<Message[]>([
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    { role: 'assistant', content: INITIAL_MESSAGE },
  ]);
  const [compressedHistory, setCompressedHistory] = useState<string | null>(null);
  const [messagesSinceCompression, setMessagesSinceCompression] = useState(0);

  // Input state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingTest, setIsGeneratingTest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Settings state
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

  // UI state
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showMobileSettings, setShowMobileSettings] = useState(false);
  const [compressionCelebration, setCompressionCelebration] = useState<{
    show: boolean;
    tokensSaved: number;
    moneySaved: number;
    compressionRatio: number;
    latencyMs: number;
  } | null>(null);

  // Stats state
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

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const theoreticalUncompressedRef = useRef(0);
  const lastAssistantTokensRef = useRef(0);

  // Load models on mount
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

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages]);

  // Reset chat helper
  const resetChat = useCallback((newSystemPrompt: string) => {
    setDisplayMessages([
      { id: 'initial', role: 'assistant', content: INITIAL_MESSAGE, timestamp: Date.now() },
    ]);
    setApiMessages([
      { role: 'system', content: newSystemPrompt },
      { role: 'assistant', content: INITIAL_MESSAGE },
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
  }, []);

  // System prompt handlers
  const handleEditPrompt = () => {
    setPendingSystemPrompt(systemPrompt);
    setIsEditingPrompt(true);
  };

  const handleSavePrompt = () => {
    if (pendingSystemPrompt !== systemPrompt) {
      if (confirm('Changing the system prompt will restart the chat. Continue?')) {
        setSystemPrompt(pendingSystemPrompt);
        setIsEditingPrompt(false);
        setTimeout(() => resetChat(pendingSystemPrompt), 0);
      }
    } else {
      setIsEditingPrompt(false);
    }
  };

  const handleCancelPrompt = () => {
    setPendingSystemPrompt(systemPrompt);
    setIsEditingPrompt(false);
  };

  // Build messages for API
  const buildMessagesForApi = useCallback((): Message[] => {
    const messages: Message[] = [{ role: 'system', content: systemPrompt }];

    if (compressedHistory) {
      messages.push({
        role: 'system',
        content: `Previous conversation context:\n${compressedHistory}`,
        isCompressedHistory: true,
      });
    }

    const recentApiMessages = apiMessages.slice(1).filter((m) => !m.isCompressedHistory);
    const messagesToAdd = compressedHistory
      ? recentApiMessages.slice(-messagesSinceCompression)
      : recentApiMessages;

    messages.push(...messagesToAdd);
    return messages;
  }, [systemPrompt, compressedHistory, apiMessages, messagesSinceCompression]);

  // Perform compression
  const performCompression = useCallback(async () => {
    const messagesToCompress = apiMessages.slice(1).filter((m) => !m.isCompressedHistory);
    if (messagesToCompress.length === 0) return;

    let textToCompress = compressedHistory ? compressedHistory + '\n\n' : '';

    for (const msg of messagesToCompress) {
      const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
      textToCompress += `<ttc_safe>${roleLabel}:</ttc_safe> ${msg.content}\n\n`;
    }

    try {
      const result = await compressText(textToCompress.trim(), settings.compressionAggressiveness);

      setCompressedHistory(result.output);
      setMessagesSinceCompression(0);

      const tokensSaved = result.originalInputTokens - result.outputTokens;
      const compressionRatio =
        result.originalInputTokens > 0
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

      setTimeout(() => setCompressionCelebration(null), 4000);

      setStats((prev) => ({
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

  // Send message
  const handleSendMessage = async (messageContent?: string) => {
    const content = messageContent || inputValue.trim();
    if (!content || isLoading || !model) return;

    setError(null);
    setInputValue('');
    setIsLoading(true);

    // Add user message
    const userDisplayMessage: DisplayMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setDisplayMessages((prev) => [...prev, userDisplayMessage]);

    const userApiMessage: Message = { role: 'user', content };
    setApiMessages((prev) => [...prev, userApiMessage]);

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

      // Add assistant message
      const assistantDisplayMessage: DisplayMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
      };
      setDisplayMessages((prev) => [...prev, assistantDisplayMessage]);

      const assistantApiMessage: Message = { role: 'assistant', content: response.content };
      setApiMessages((prev) => [...prev, assistantApiMessage]);
      setMessagesSinceCompression((prev) => prev + 1);

      // Update stats
      const estimateTokens = (text: string) => Math.round(text.length / 4);
      const systemPromptTokens = estimateTokens(systemPrompt);
      const compressedHistoryTokens = compressedHistory
        ? estimateTokens(compressedHistory) + estimateTokens('Previous conversation context:\n')
        : 0;
      const estimatedCachedTokens =
        requestCount > 0 ? systemPromptTokens + compressedHistoryTokens : 0;

      setRequestCount((prev) => prev + 1);

      const newCost = calculateCost(
        response.usage.promptTokens,
        response.usage.completionTokens,
        model
      );
      setStats((prev) => ({
        ...prev,
        inputTokens: prev.inputTokens + response.usage.promptTokens,
        cachedInputTokens: prev.cachedInputTokens + estimatedCachedTokens,
        outputTokens: prev.outputTokens + response.usage.completionTokens,
        cost: prev.cost + newCost,
      }));

      // Update context history for graph
      const userMsgTokens = estimateTokens(content);
      const assistantMsgTokens = estimateTokens(response.content);

      if (theoreticalUncompressedRef.current === 0) {
        theoreticalUncompressedRef.current = response.usage.promptTokens;
      } else {
        theoreticalUncompressedRef.current += lastAssistantTokensRef.current + userMsgTokens;
      }
      lastAssistantTokensRef.current = assistantMsgTokens;

      setContextHistory((prev) => [...prev, response.usage.promptTokens]);
      setUncompressedHistory((prev) => [...prev, theoreticalUncompressedRef.current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate test message
  const handleGenerateTestMessage = async () => {
    if (isGeneratingTest || !model) return;

    const lastAssistantMessage =
      displayMessages.filter((m) => m.role === 'assistant').pop()?.content ||
      'Hello! How can I help you today?';

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

  // Get raw messages for display
  const getRawMessages = (): Message[] => {
    const messages: Message[] = [{ role: 'system', content: systemPrompt }];

    if (compressedHistory) {
      messages.push({
        role: 'system',
        content: `Previous conversation context:\n${compressedHistory}`,
        isCompressedHistory: true,
      });
    }

    const recentMessages = apiMessages.slice(1).filter((m) => !m.isCompressedHistory);
    messages.push(...recentMessages);

    return messages;
  };

  // Settings handlers
  const handleEditSettings = () => {
    setPendingSettings({
      compressionFrequency: settings.compressionFrequency,
      compressionAggressiveness: settings.compressionAggressiveness,
    });
    setIsEditingSettings(true);
  };

  const handleSaveSettings = () => {
    setSettings((prev) => ({
      ...prev,
      compressionFrequency: pendingSettings.compressionFrequency,
      compressionAggressiveness: pendingSettings.compressionAggressiveness,
    }));
    setIsEditingSettings(false);
  };

  const handleCancelSettings = () => {
    setIsEditingSettings(false);
  };

  // Loading state
  if (!model) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen-safe flex overflow-hidden">
      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        <Header
          model={model}
          models={models}
          systemPrompt={systemPrompt}
          pendingSystemPrompt={pendingSystemPrompt}
          isEditingPrompt={isEditingPrompt}
          onModelChange={setModel}
          onShowHowItWorks={() => setShowHowItWorks(true)}
          onShowMobileSettings={() => setShowMobileSettings(true)}
          onEditPrompt={handleEditPrompt}
          onSavePrompt={handleSavePrompt}
          onCancelPrompt={handleCancelPrompt}
          onPendingPromptChange={setPendingSystemPrompt}
        />

        {compressionCelebration?.show && (
          <CompressionCelebration
            tokensSaved={compressionCelebration.tokensSaved}
            moneySaved={compressionCelebration.moneySaved}
            compressionRatio={compressionCelebration.compressionRatio}
            latencyMs={compressionCelebration.latencyMs}
          />
        )}

        <ChatMessages
          ref={messagesEndRef}
          displayMessages={displayMessages}
          rawMessages={getRawMessages()}
          showRawMessages={settings.showRawMessages}
          isLoading={isLoading}
        />

        {error && (
          <div className="px-4 py-2 bg-red-900/50 border-t border-red-800 text-red-200 text-sm">
            {error}
          </div>
        )}

        <ChatInput
          ref={inputRef}
          value={inputValue}
          isLoading={isLoading}
          isGeneratingTest={isGeneratingTest}
          onChange={setInputValue}
          onSend={() => handleSendMessage()}
          onGenerateTest={handleGenerateTestMessage}
        />
      </div>

      <SettingsPanel
        showMobile={showMobileSettings}
        onCloseMobile={() => setShowMobileSettings(false)}
        compressionFrequency={settings.compressionFrequency}
        compressionAggressiveness={settings.compressionAggressiveness}
        isEditingSettings={isEditingSettings}
        pendingFrequency={pendingSettings.compressionFrequency}
        pendingAggressiveness={pendingSettings.compressionAggressiveness}
        onEditSettings={handleEditSettings}
        onSaveSettings={handleSaveSettings}
        onCancelSettings={handleCancelSettings}
        onPendingFrequencyChange={(v) => setPendingSettings((p) => ({ ...p, compressionFrequency: v }))}
        onPendingAggressivenessChange={(v) => setPendingSettings((p) => ({ ...p, compressionAggressiveness: v }))}
        showRawMessages={settings.showRawMessages}
        onShowRawMessagesChange={(v) => setSettings((p) => ({ ...p, showRawMessages: v }))}
        contextHistory={contextHistory}
        uncompressedHistory={uncompressedHistory}
        stats={stats}
        messagesSinceCompression={messagesSinceCompression}
      />

      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-zinc-400">Loading...</div>
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  );
}
