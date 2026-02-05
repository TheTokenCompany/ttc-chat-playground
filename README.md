# The Token Company Chat Playground

A demo application showcasing [The Token Company's](https://thetokencompany.com) context compression API. Chat with an LLM and watch your context size plateau instead of growing indefinitely.

## How Compression Works

### The Problem
In a typical chat application, every message is sent to the LLM on each turn. As the conversation grows, so does your context size (and cost):

```
Turn 1:  [System] + [User1]                                    → 500 tokens
Turn 2:  [System] + [User1] + [Assistant1] + [User2]           → 800 tokens
Turn 3:  [System] + [User1] + [Assistant1] + [User2] + [A2] + [U3] → 1100 tokens
...
Turn 20: [System] + [All previous messages]                    → 5000+ tokens
```

### The Solution
With TTC compression, context size **plateaus** because we periodically compress the conversation history:

```
Turn 1-4:  Normal growth (500 → 800 → 1100 → 1400 tokens)
Turn 5:    COMPRESSION! History compressed to ~400 tokens
Turn 6-9:  Growth resumes from lower baseline (500 → 700 → 900 → 1100)
Turn 10:   COMPRESSION! Re-compress everything
...
```

### Step-by-Step Compression Process

When compression triggers (every N messages), here's exactly what happens:

#### Step 1: Concatenate History + New Messages
```
[Previous compressed history, if any]
+
[All new messages since last compression]
```

#### Step 2: Add Protected Turn Labels
New messages get `<ttc_safe>` tags around their turn labels. These tags tell the compression API to preserve this text exactly:

```
<ttc_safe>User:</ttc_safe> What is machine learning?
<ttc_safe>Assistant:</ttc_safe> Machine learning is a subset of AI that...
<ttc_safe>User:</ttc_safe> Can you give me an example?
<ttc_safe>Assistant:</ttc_safe> Sure! A common example is email spam filtering...
```

The turn labels (`User:`, `Assistant:`) are protected so the LLM can still understand who said what after compression.

#### Step 3: Compress via TTC API
Send the concatenated text to `https://api.thetokencompany.com/v1/compress`:

```json
{
  "model": "bear-1",
  "input": "<the concatenated text>",
  "compression_settings": {
    "aggressiveness": 0.9
  }
}
```

#### Step 4: Replace Conversation History
The compressed output becomes the new conversation history, stored as a second system message:

**Before compression:**
```
[System Prompt]
[User message 1]
[Assistant message 1]
[User message 2]
[Assistant message 2]
...
```

**After compression:**
```
[System Prompt]
[Compressed History] ← All previous messages, compressed
[New User message]   ← Conversation continues
```

#### Step 5: Repeat
On the next compression trigger, the existing compressed history gets concatenated with new messages and re-compressed. The history can be compressed multiple times - it just gets more condensed.

## Setup

1. Clone this repository
2. Install dependencies: `npm install`
3. Create `.env.local` with your API keys:
   ```
   TTC_API_KEY=your_ttc_api_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   ```
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Features

- **Multiple LLM models** via OpenRouter (DeepSeek, Mistral, Gemini)
- **Configurable compression**: Adjust frequency (5-15 messages) and aggressiveness (0.1-0.9)
- **Real-time statistics**: Track input tokens, output tokens, cost, and savings
- **Context size graph**: Visualize compressed vs uncompressed context growth
- **Raw message view**: See exactly what's being sent to the API
- **AI test messages**: Generate realistic user messages to test the sandbox

## Links

- [The Token Company](https://thetokencompany.com) - Get your API key
- [TTC Documentation](https://thetokencompany.com/docs) - Full API docs
- [Protect Text Guide](https://thetokencompany.com/docs/protect-text) - Learn about `<ttc_safe>` tags
