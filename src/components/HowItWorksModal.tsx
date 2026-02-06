interface HowItWorksModalProps {
  onClose: () => void;
}

export function HowItWorksModal({ onClose }: HowItWorksModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl max-w-3xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-3 sm:p-4 flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-bold">How Compression Works</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-2xl leading-none p-1"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <Section title="When Compression Triggers">
            <p className="text-zinc-400 mb-4">
              Compression triggers when the message count reaches your{' '}
              <span className="text-indigo-400">compression frequency</span> setting
              (default: 5 messages).
            </p>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-zinc-500">Messages:</span>
                {[1, 2, 3, 4, 5].map((n) => (
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
          </Section>

          <Section title="What Gets Compressed">
            <p className="text-zinc-400 mb-4">
              All messages since the last compression get compressed into a summary.
              The system prompt is{' '}
              <span className="text-yellow-400">never compressed</span>.
            </p>
          </Section>

          <Section title="The Compression Process">
            <p className="text-zinc-400 mb-4">
              When compression triggers, three things happen:
            </p>
            <div className="space-y-3">
              <ProcessStep
                number={1}
                title="Concatenate history + new messages"
              >
                <div className="font-mono text-xs space-y-1 text-zinc-500">
                  <div className="text-purple-400">[Previous compressed history]</div>
                  <div>+</div>
                  <div className="text-blue-400">[New messages since last compression]</div>
                </div>
              </ProcessStep>

              <ProcessStep
                number={2}
                title={
                  <>
                    Wrap turn labels with{' '}
                    <code className="text-green-400">&lt;ttc_safe&gt;</code>
                  </>
                }
              >
                <div className="font-mono text-xs space-y-1">
                  <div>
                    <span className="text-green-400">&lt;ttc_safe&gt;</span>
                    <span className="text-blue-400">User:</span>
                    <span className="text-green-400">&lt;/ttc_safe&gt;</span>
                    <span className="text-zinc-400"> message content...</span>
                  </div>
                </div>
              </ProcessStep>

              <ProcessStep number={3} title="Replace conversation history">
                <div className="font-mono text-xs text-zinc-500">
                  <span className="text-zinc-400">Old history</span>
                  <span className="text-indigo-400 mx-2">→ TTC API →</span>
                  <span className="text-green-400">New compressed history</span>
                </div>
              </ProcessStep>
            </div>
            <p className="text-zinc-500 text-sm mt-4">
              The compressed output becomes the new conversation history, ready to
              be re-compressed with future messages.
            </p>
          </Section>

          <Section title="Why Context Size Plateaus">
            <p className="text-zinc-400 mb-4">
              Without compression, context grows linearly. With compression, it{' '}
              <span className="text-green-400">plateaus</span> because old messages
              are continuously compressed.
            </p>
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="flex gap-8">
                <GraphDemo
                  heights={[20, 35, 50, 65, 80, 95]}
                  color="bg-zinc-600"
                  label="Without: grows"
                  labelColor="text-zinc-500"
                />
                <GraphDemo
                  heights={[20, 35, 50, 45, 48, 46]}
                  color="bg-indigo-500"
                  label="With: plateaus"
                  labelColor="text-indigo-400"
                />
              </div>
            </div>
          </Section>

          {/* Mobile links */}
          <div className="flex flex-wrap gap-4 pt-2 text-sm sm:hidden">
            <a
              href="https://thetokencompany.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Get API Key
            </a>
            <a
              href="https://github.com/TheTokenCompany/ttc-chat-playground"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              GitHub
            </a>
            <a
              href="https://thetokencompany.com/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-800/50 rounded-lg p-3 sm:p-4 border border-zinc-700">
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">{title}</h3>
      {children}
    </div>
  );
}

function ProcessStep({
  number,
  title,
  children,
}: {
  number: number;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <div className="text-sm font-medium text-zinc-300 mb-2">
        {number}. {title}
      </div>
      {children}
    </div>
  );
}

function GraphDemo({
  heights,
  color,
  label,
  labelColor,
}: {
  heights: number[];
  color: string;
  label: string;
  labelColor: string;
}) {
  return (
    <div className="flex-1">
      <div className="h-16 flex items-end gap-0.5">
        {heights.map((h, i) => (
          <div
            key={i}
            className={`flex-1 ${color} rounded-t`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className={`text-xs ${labelColor} text-center mt-2`}>{label}</div>
    </div>
  );
}
