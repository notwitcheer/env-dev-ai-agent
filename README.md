# Multi-Agent Development Environment

A flexible TypeScript framework for building AI agent systems with support for tools, memory, subagents, and more.

## Key Concepts

### What is an Agent?

An **agent** is an autonomous program that can:
- ✅ Receive goals/tasks
- ✅ Reason about how to accomplish them
- ✅ Use **tools** to interact with the world
- ✅ Maintain **context** and **memory**
- ✅ Create **subagents** to delegate specialized tasks

### System Architecture

```
┌─────────────────────────────────────┐
│      Agent Runtime                  │
│  (Orchestration & Lifecycle)        │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
┌──────▼──────┐  ┌─────▼──────┐
│   Context   │  │   Memory   │
│   Manager   │  │   Store    │
└─────┬───────┘  └────┬───────┘
      │               │
      └───────┬───────┘
              │
   ┌──────────▼───────────┐
   │   Tool Registry      │
   │  - File operations   │
   │  - Calculations      │
   │  - Custom tools...   │
   └──────────────────────┘
```

## Quick Start

### Installation

```bash
npm install
```

### Execute Demo

```bash
# Dev mode (with hot reload)
npm run dev

# Build and production mode
npm run demo
```

## 🎓 Learning Guide

### 1. Messages - The Communication System

Agents communicate via **structured messages**:

```typescript
enum MessageRole {
  SYSTEM = ‘system’,      // Permanent instructions for the agent
  USER = ‘user’,          // User input
  ASSISTANT = ‘assistant’, // Agent responses
  TOOL = ‘tool’,          // Results of executed tools
}
```

**Example:**
```typescript
const message: Message = {
  role: MessageRole.USER,
  content: “Read the config.json file”,
  timestamp: new Date()
};
```

### 2. Tools - Agent Capabilities

**Tools** are the agent's “superpowers.” Each tool:
- 📝 Has a name and description
- 🔧 Defines its parameters (with validation)
- ⚡ Performs an asynchronous action
- 🔒 May require permissions

**Create a custom tool:**

```typescript
import { Tool, ToolResult } from './types/agent.types';
import { z } from 'zod';

const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Get weather for a city',

  parameters: [
    {
      name: 'city',
      type: 'string',
      description: 'City name',
      required: true,
      schema: z.string().min(1)
    }
  ],

  async execute(params): Promise<ToolResult> {
    // Your code here
    const weather = await fetchWeather(params.city);

    return {
      success: true,
      data: { temperature: 20, condition: 'sunny' }
    };
  }
};

// Save the tool
globalToolRegistry.register(weatherTool);
```

### 3. Context - Agent Awareness

The **context** contains everything the agent “knows”:

```typescript
interface AgentContext {
  messages: Message[];           // Conversation history
  environment: Record<string, any>; // Environment variables
  availableTools: string[];      // Available tools
  workingMemory: Record<string, any>; // Temporary memory
  sessionId: string;             // Session ID
  parentAgentId?: string;        // If it is a subagent
}
```

### 4. Memory - State Storage

The **MemoryManager** manages two types of memory:

#### Working Memory
Temporary, like RAM:

```typescript
const memory = agent.getMemory();

// Store a value
memory.set(‘user_preference’, ‘dark_mode’);

// Retrieve a value
const pref = memory.get(‘user_preference’);

// List all keys
const keys = memory.keys();
```

#### Conversation Memory
Message history:

```typescript
// Add a message
memory.addMessage({
  role: MessageRole.USER,
  content: ‘Hello!’,
  timestamp: new Date()
});

// Retrieve the last 5 messages
const recent = memory.getRecentMessages(5);

// Search the history
const results = memory.searchMessages(‘config’);
```

#### Persistence
Save/load from disk:

```typescript
// Save
await memory.persist();

// Load
await memory.load();
```

5. Agent Configuration - The Blueprint

The **configuration** defines an agent:

```typescript
const config: AgentConfig = {
  name: ‘CodeAnalyzer’,
  description: ‘Source code analysis’,

  // System prompt - defines behavior
  systemPrompt: `You are an expert in code analysis.
  You can read files and identify bugs.`,

  // Available tools
  tools: [‘read_file’, ‘list_directory’, ‘search_code’],

  // Operating mode
  mode: ‘autonomous’, // or ‘interactive’ or 'planning'

  // Capabilities
  canSpawnSubagents: true,
  maxSubagents: 3,

  // Memory
  memoryConfig: {
    enabled: true,
    persistToDisk: true,
    memoryPath: ‘./memory’
  },

  // Security limits
  maxIterations: 50
};
```

### 6. Tool Registry - The Tool Manager

The **ToolRegistry** centralizes all tools:

```typescript
import { globalToolRegistry } from ‘./core/tool-registry’;

// Register a tool
globalToolRegistry.register(myTool);

// Register multiple tools
globalToolRegistry.registerMultiple([tool1, tool2, tool3]);

// List all tools
const tools = globalToolRegistry.listTools();

// Get a tool
const calculator = globalToolRegistry.getTool(‘calculator’);

// Execute a tool
const result = await globalToolRegistry.executeTool(
  ‘calculator’,
  { expression: ‘2 + 2’ }
);
```

7. Create and Use an Agent

```typescript
import { Agent } from ‘./core/agent’;
import { globalToolRegistry } from ‘./core/tool-registry’;

// 1. Set up the tools
globalToolRegistry.registerMultiple(fileTools);
globalToolRegistry.registerMultiple(utilityTools);

// 2. Create the configuration
const config: AgentConfig = {
  name: ‘Assistant’,
  description: ‘A useful assistant’,
  systemPrompt: ‘You are an assistant who helps with files.’,
  tools: [‘read_file’, ‘write_file’, ‘calculator’],
  mode: ‘interactive’
};

// 3. Create the agent
const agent = new Agent(config, globalToolRegistry);

// 4. Execute a task
const response = await agent.execute(‘Calculate 15 * 23 + 100’);

console.log(response.message);
// Output: “Calculating the expression...”

// 5. Check the memory
const memory = agent.getMemory();
console.log(memory.get(‘tool_result_calculator’));
// Output: { success: true, data: { result: 445 } }
```

### 8. Subagents - Task Delegation

**Subagents** allow you to delegate specialized tasks:

```typescript
// Subagent configuration
const subConfig: AgentConfig = {
  name: ‘SecurityAnalyzer’,
  description: ‘Code security analysis’,
  systemPrompt: ‘You are a security expert.’,
  tools: [‘read_file’, ‘search_vulnerabilities’],
  mode: ‘autonomous’
};

// The main agent spawns a subagent
const result = await mainAgent.spawnSubagent(
  subConfig,
  ‘Analyze this file for vulnerabilities’
);

// The subagent executes the task autonomously
console.log(result.message);
```

## Security and Permissions

Tools can define **permission levels**:

```typescript
const dangerousTool: Tool = {
  name: ‘delete_database’,
  description: ‘Deletes the database’,
  requiresPermission: true,
  permissionLevel: ‘admin’, // Requires admin

  async execute(params): Promise<ToolResult> {
    // Deletion logic
  }
};
```

**Security limits in AgentConfig:**

```typescript
const config: AgentConfig = {
  maxIterations: 100,  // Prevents infinite loops
  maxSubagents: 5,     // Limits the number of subagents
  // ...
};
```

## Workflows and Modes

### Autonomous Mode
The agent decides for itself what actions to take:
```typescript
mode: ‘autonomous’
```

### Interactive Mode
The agent asks for confirmation before acting:
```typescript
mode: ‘interactive’
```

### Planning Mode
The agent creates a plan before executing:
```typescript
mode: 'planning'
```