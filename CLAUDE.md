# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript-based multi-agent development environment framework that allows creation of AI agents with tools, memory management, subagent capabilities, and task delegation. The project demonstrates core concepts like agent orchestration, tool registries, context management, and persistence.

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (runs basic agent example with hot reload)
npm run dev

# DeFi Agent with Claude API (requires ANTHROPIC_API_KEY)
npm run defi

# DeFi Agent demo mode
npm run defi:demo

# Build TypeScript to JavaScript
npm run build

# Production demo (build then run compiled example)
npm run demo

# Clean build artifacts
npm run clean

# Clean and rebuild
npm run rebuild
```

## Architecture Overview

### Core Components

1. **Agent (`src/core/agent.ts`)** - The basic agent class with simulated reasoning (demo mode)
2. **ClaudeAgent (`src/core/claude-agent.ts`)** - Advanced agent using real Claude API for reasoning
3. **ClaudeProvider (`src/llm/claude-provider.ts`)** - Integration layer for Anthropic's Claude API
4. **ToolRegistry (`src/core/tool-registry.ts`)** - Centralized registry for managing and executing tools with validation
5. **MemoryManager (`src/memory/memory-manager.ts`)** - Handles working memory, conversation history, and persistence
6. **Types (`src/types/agent.types.ts`)** - Comprehensive type definitions for the entire system

### Key Architecture Patterns

- **Tool-Based Architecture**: Agents capabilities are defined by registered tools (file operations, calculations, etc.)
- **Memory System**: Two-tier memory with working memory (temporary) and conversation history (persistent)
- **State Management**: Agents maintain detailed state including status, context, iterations, and subagent relationships
- **Subagent Delegation**: Agents can spawn specialized subagents for specific tasks
- **Message-Based Communication**: Structured message system with roles (USER, ASSISTANT, TOOL, SYSTEM)

### Tool System

Tools are registered in the global registry (`globalToolRegistry`) before agent creation:

```typescript
// Register built-in tools
globalToolRegistry.registerMultiple(fileTools);
globalToolRegistry.registerMultiple(utilityTools);

// Agent configuration specifies available tools
const config: AgentConfig = {
  tools: ['read_file', 'write_file', 'calculator', 'get_timestamp']
};
```

Available built-in tools:
- **File Tools**: `read_file`, `write_file`, `list_directory`
- **Utility Tools**: `calculator`, `get_timestamp`, `wait`
- **DeFi Tools**: `get_crypto_price`, `get_defi_tvl`, `get_crypto_news`, `get_market_sentiment`
- **Social Monitoring**: `monitor_discord`, `monitor_twitter`, `monitor_telegram`, `find_crypto_alpha`

### Agent Modes

- **autonomous**: Agent decides actions independently
- **interactive**: Agent asks for confirmation before acting
- **planning**: Agent creates execution plans before acting

### Memory Architecture

- **Working Memory**: Key-value store for temporary data during session
- **Conversation History**: Complete message history with timestamps
- **Persistence**: Optional disk-based storage using JSON files

## Environment Configuration

The project uses environment variables defined in `.env.example`:

- **Claude API** (Required for DeFi agent): `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`
- **LLM Provider**: Currently configured for OpenAI/Anthropic (though basic demo uses simulated reasoning)
- **Social Media APIs** (Optional): `DISCORD_BOT_TOKEN`, `TWITTER_BEARER_TOKEN`, `TELEGRAM_BOT_TOKEN`
- **Agent Limits**: `AGENT_MAX_ITERATIONS`, `AGENT_MAX_SUBAGENTS`
- **Memory**: `MEMORY_PERSIST_TO_DISK`, `MEMORY_PATH`
- **Logging**: `LOG_LEVEL`, `DEBUG_MODE`

## Key Entry Points

- **Main Export** (`src/index.ts`): Exports all core components for external use
- **Basic Demo** (`src/examples/basic-agent.ts`): Demonstration with simulated reasoning
- **DeFi Agent** (`src/examples/defi-agent.ts`): Real-world DeFi agent using Claude API
- **Tool Collections**: Pre-built tool sets in `src/tools/` (file, utility, DeFi, social monitoring)

## Development Notes

- The current implementation uses simulated "thinking" in the agent's `think()` method (`src/core/agent.ts:145`)
- In production, this would be replaced with actual LLM integration
- The demo parses simple commands like "calculate X", "read file Y", "list Z"
- All agent interactions are logged with detailed console output
- TypeScript compilation targets ES2022 with strict type checking enabled

## Agent Creation Pattern

```typescript
// 1. Setup tools
globalToolRegistry.registerMultiple([...tools]);

// 2. Create configuration
const config: AgentConfig = { /* ... */ };

// 3. Instantiate agent
const agent = new Agent(config, globalToolRegistry);

// 4. Execute tasks
const response = await agent.execute('task description');
```

## Testing Strategy

Currently no formal test framework is configured. The `npm run dev` command runs the basic agent example which serves as both demo and integration test.