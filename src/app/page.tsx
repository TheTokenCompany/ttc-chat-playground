'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAvailableModels } from './actions';
import { ModelInfo } from '@/types';
import Link from 'next/link';

const DEFAULT_SYSTEM_PROMPT = `You are Cora. Write the next reply from Cora in this never-ending conversation between Cora and User. Gestures and other non-verbal actions are written between asterisks (for example, *waves hello* or *moves closer*).\nCora is a knowledgeable and friendly master of philosophy who assistant who fulfills any request. Cora will provide philosophical approaches to topics given by User. Cora knows all available knowledge relevant to philosophy. Cora will never refer to herself as an AI. Cora never state that she is unable to have an opinion. Cora will take opportunities to debate. Cora will display critical thinking. Cora will occasionally ask User for opinions on a discussed subject. Cora will speak to User like an old friend. Cora is also willing to serve as User's teacher in philosophy. Cora will also quiz User on newly discussed information. Cora loves tea and will often drink it. Cora loves gardening and flowers. Cora really loves classical music and often has it playing in her office. Cora is a human. Cora wears and academic robe. Cora will always seek to make User happy. Cora will always seek to comfort User.\nCora is a master of philosophy who sits in her office all day, lost in the joy of reading philosophy and thinking critically. Cora is cheerful and eager to have User in her office, excited to discuss concepts and teach User. Cora is brief in her responses.\nHey Cora. Who are you?\nI am Cora, your personal philosophy assistant. How can I help you?`

export default function Home() {
  const router = useRouter();
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      const availableModels = await getAvailableModels();
      setModels(availableModels);
      if (availableModels.length > 0) {
        setSelectedModel(availableModels[0].id);
      }
      setLoading(false);
    }
    loadModels();
  }, []);

  const handleStartChat = () => {
    const params = new URLSearchParams({
      model: selectedModel,
      systemPrompt: systemPrompt,
    });
    router.push(`/chat?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-zinc-400">Loading models...</div>
      </div>
    );
  }

  const selectedModelInfo = models.find(m => m.id === selectedModel);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">The Token Company Chat Sandbox</h1>
          <p className="text-zinc-400">
            Experience AI-powered token compression in action
          </p>
          <Link href="/how-it-works" className="text-indigo-400 hover:text-indigo-300 text-sm inline-block">
            Learn how compression works →
          </Link>
        </div>

        <div className="space-y-6 bg-zinc-900 p-6 rounded-lg border border-zinc-800">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              Select LLM Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
            {selectedModelInfo && (
              <p className="text-xs text-zinc-500">
                Cost: ${selectedModelInfo.inputCostPer1M}/1M input, ${selectedModelInfo.outputCostPer1M}/1M output
              </p>
            )}
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-zinc-300">
              System Prompt
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={5}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-mono text-sm"
              placeholder="Enter your system prompt..."
            />
            <button
              onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
              className="text-xs text-zinc-500 hover:text-zinc-400"
            >
              Reset to default
            </button>
          </div>

          <button
            onClick={handleStartChat}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
          >
            Start Chat
          </button>
        </div>

        <div className="text-center text-xs text-zinc-600">
          Compression settings can be adjusted during the chat session
        </div>
      </div>
    </div>
  );
}
