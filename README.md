# Multi-Agent Development Environment

A flexible TypeScript framework for building AI agent systems, featuring a powerful **DeFi Research Assistant** powered by Claude AI.

## 🚀 Quick Start - DeFi Agent

### Setup
```bash
# Install dependencies
npm install

# Configure Claude API
cp .env.example .env
# Add your Anthropic API key: ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Run Your DeFi Assistant
```bash
# Interactive mode
npm run defi

# Demo mode
npm run defi:demo
```

## 🎯 What Your DeFi Agent Can Do

- 📊 **Real-time crypto prices** (Bitcoin, Ethereum, any coin)
- 💰 **DeFi protocol analysis** (TVL, metrics via DeFiLlama)
- 📰 **Crypto news monitoring**
- 📈 **Market sentiment analysis** (Fear & Greed Index)
- 🎯 **Alpha opportunity detection** via social monitoring
- 📱 **Discord/Twitter/Telegram tracking** for signals

## 💬 Example Questions

```
"What's the current Ethereum price and market sentiment?"
"Find me the top 5 DeFi protocols by TVL"
"Any alpha opportunities in crypto right now?"
"Compare Solana vs Polygon ecosystems"
"Monitor social signals for airdrops"
```

## 🏗️ Framework Architecture

### Core Components

- **Agent** - Basic agent with simulated reasoning
- **ClaudeAgent** - Advanced agent using real Claude API
- **ToolRegistry** - Centralized tool management
- **MemoryManager** - Conversation history and persistence

### Available Tools

- **DeFi Tools**: `get_crypto_price`, `get_defi_tvl`, `get_crypto_news`, `get_market_sentiment`
- **Social Monitoring**: `monitor_discord`, `monitor_twitter`, `find_crypto_alpha`
- **File Tools**: `read_file`, `write_file`, `list_directory`
- **Utilities**: `calculator`, `get_timestamp`

### Quick Agent Creation

```typescript
import { ClaudeAgent, globalToolRegistry, defiTools } from './src/index';

// Setup tools
globalToolRegistry.registerMultiple(defiTools);

// Configure agent
const config = {
  name: 'My DeFi Agent',
  systemPrompt: 'You are a DeFi expert. Always respond in English.',
  tools: ['get_crypto_price', 'get_market_sentiment'],
  mode: 'autonomous'
};

// Create and use
const agent = new ClaudeAgent(config, globalToolRegistry, {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-haiku-20240307'
});

const response = await agent.execute('What is Bitcoin doing today?');
```

## 📚 Documentation

- **CLAUDE.md** - Technical guide for Claude Code
- **README-DEFI.md** - Detailed DeFi agent documentation
- **GUIDE_DEBUTANT.md** - Beginner's guide to AI agents and DeFi

## 🔧 Development Commands

```bash
npm run build      # Compile TypeScript
npm run dev        # Basic agent demo
npm run defi       # DeFi agent (requires API key)
npm run defi:demo  # DeFi agent demo mode
npm run clean      # Clean build artifacts
```

## 🎓 Learning Path

1. **Start here**: Run `npm run defi:demo` to see it in action
2. **Understand basics**: Read the core concepts below
3. **Customize**: Modify tools and prompts for your needs
4. **Extend**: Create new tools and agents

## 🧠 Core Concepts

### Messages
Agents communicate via structured messages with roles: `user`, `assistant`, `tool`, `system`.

### Tools
Functions that give agents capabilities. Each tool has:
- Name and description
- Typed parameters with validation
- Async execution function
- Optional permissions

### Memory
Two-tier system:
- **Working Memory**: Temporary session data
- **Conversation History**: Persistent message storage

### Agent Modes
- **autonomous**: Agent decides actions independently
- **interactive**: Asks for confirmation
- **planning**: Creates execution plans first

## 🔑 Environment Setup

Required:
```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

Optional (for advanced social monitoring):
```bash
DISCORD_BOT_TOKEN=...
TWITTER_BEARER_TOKEN=...
TELEGRAM_BOT_TOKEN=...
```

## 🛡️ Security

- All tool parameters validated with Zod schemas
- Permission levels for sensitive operations
- Configurable limits (max iterations, subagents)
- No secrets logged or committed

---

**Ready to explore DeFi with AI?** Start with `npm run defi:demo` and watch your intelligent assistant in action! 🎯