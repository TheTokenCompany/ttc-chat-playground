'use client';

import Link from 'next/link';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">How Compression Works</h1>
          <Link href="/" className="text-indigo-400 hover:text-indigo-300">
            ← Back
          </Link>
        </div>

        <div className="space-y-8">
          {/* When compression happens */}
          <Section title="When Compression Triggers">
            <p className="text-zinc-400 mb-4">
              Compression triggers when the message count reaches your <span className="text-indigo-400">compression frequency</span> setting (default: 5 messages).
            </p>
            <div className="bg-zinc-900 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Messages:</span>
                {[1, 2, 3, 4, 5].map(n => (
                  <div
                    key={n}
                    className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                      n === 5 ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {n}
                  </div>
                ))}
                <span className="text-indigo-400 ml-2">→ Compress!</span>
              </div>
            </div>
          </Section>

          {/* What gets compressed */}
          <Section title="What Gets Compressed">
            <p className="text-zinc-400 mb-4">
              All messages since the last compression (or all messages if first time) get compressed into a single summary. The system prompt is <span className="text-yellow-400">never compressed</span>.
            </p>
            <div className="space-y-2">
              <MessageBox role="system" content="You are a helpful assistant..." protected />
              <div className="border-2 border-dashed border-indigo-500 rounded-lg p-3 space-y-2">
                <div className="text-xs text-indigo-400 mb-1">These get compressed together ↓</div>
                <MessageBox role="user" content="What is AI?" small />
                <MessageBox role="assistant" content="AI is artificial intelligence..." small />
                <MessageBox role="user" content="Give me an example" small />
                <MessageBox role="assistant" content="ChatGPT is an example..." small />
              </div>
            </div>
          </Section>

          {/* Protected tags */}
          <Section title="Protecting Turn Labels">
            <p className="text-zinc-400 mb-4">
              Messages are formatted with <code className="text-green-400">&lt;ttc_safe&gt;</code> tags around turn labels. These tags protect the labels from compression, keeping the conversation structure intact.
            </p>
            <div className="bg-zinc-900 rounded-lg p-4 font-mono text-sm space-y-1">
              <div>
                <span className="text-green-400">&lt;ttc_safe&gt;</span>
                <span className="text-blue-400">User:</span>
                <span className="text-green-400">&lt;/ttc_safe&gt;</span>
                <span className="text-zinc-300"> What is AI?</span>
              </div>
              <div>
                <span className="text-green-400">&lt;ttc_safe&gt;</span>
                <span className="text-purple-400">Assistant:</span>
                <span className="text-green-400">&lt;/ttc_safe&gt;</span>
                <span className="text-zinc-300"> AI is artificial intelligence...</span>
              </div>
            </div>
          </Section>

          {/* The result */}
          <Section title="After Compression">
            <p className="text-zinc-400 mb-4">
              The compressed history becomes a second system message. New messages are added after it. When compression triggers again, the existing compressed history is included and re-compressed with new messages.
            </p>
            <div className="space-y-2">
              <MessageBox role="system" content="You are a helpful assistant..." protected />
              <MessageBox role="compressed" content="User asked about AI. Assistant explained AI is artificial intelligence, gave ChatGPT as example..." />
              <MessageBox role="user" content="What about deep learning?" highlight />
            </div>
          </Section>

          {/* Context size graph explanation */}
          <Section title="Why Context Size Plateaus">
            <p className="text-zinc-400 mb-4">
              Without compression, context grows linearly with each message. With compression, context size <span className="text-green-400">plateaus</span> because old messages are continuously compressed into a fixed-size summary.
            </p>
            <div className="bg-zinc-900 rounded-lg p-4">
              <div className="h-24 flex items-end gap-1">
                {/* Simulated graph bars - without compression (gray, growing) */}
                {[20, 30, 40, 50, 60, 70, 80, 90, 100].map((h, i) => (
                  <div key={`gray-${i}`} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-zinc-700 rounded-t" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="text-xs text-zinc-500 text-center mt-2">Without compression: keeps growing</div>
              <div className="h-24 flex items-end gap-1 mt-4">
                {/* Simulated graph bars - with compression (indigo, plateaus) */}
                {[20, 35, 50, 45, 55, 50, 52, 48, 51].map((h, i) => (
                  <div key={`indigo-${i}`} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full bg-indigo-500 rounded-t" style={{ height: `${h}%` }} />
                  </div>
                ))}
              </div>
              <div className="text-xs text-indigo-400 text-center mt-2">With compression: plateaus</div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-6 border border-zinc-800">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function MessageBox({
  role,
  content,
  protected: isProtected,
  small,
  highlight,
}: {
  role: 'system' | 'user' | 'assistant' | 'compressed';
  content: string;
  protected?: boolean;
  small?: boolean;
  highlight?: boolean;
}) {
  const styles = {
    system: 'bg-yellow-900/30 border-yellow-700/50',
    user: 'bg-blue-900/30 border-blue-700/50',
    assistant: 'bg-green-900/30 border-green-700/50',
    compressed: 'bg-purple-900/30 border-purple-700/50',
  };

  const labels = {
    system: 'SYSTEM',
    user: 'USER',
    assistant: 'ASSISTANT',
    compressed: 'COMPRESSED HISTORY',
  };

  return (
    <div
      className={`rounded-lg border ${styles[role]} ${small ? 'p-2' : 'p-3'} ${
        highlight ? 'ring-2 ring-indigo-500' : ''
      }`}
    >
      <div className={`font-bold mb-1 opacity-70 flex items-center gap-2 ${small ? 'text-[10px]' : 'text-xs'}`}>
        {labels[role]}
        {isProtected && <span className="text-yellow-400 font-normal">(never compressed)</span>}
      </div>
      <div className={small ? 'text-xs text-zinc-400' : 'text-sm'}>{content}</div>
    </div>
  );
}
