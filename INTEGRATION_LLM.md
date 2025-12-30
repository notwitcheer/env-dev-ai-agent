# 🧠 LLM Integration - Complete Guide

This guide explains how to integrate a real LLM (Large Language Model) into your agent system.

## 📋 Table of Contents

1. [Why integrate an LLM?](#why-integrate-an-llm)
2. [Available options](#available-options)
3. [OpenAI integration](#openai-integration)
4. [Anthropic (Claude) Integration](#anthropic-claude-integration)
5. [Integration Architecture](#integration-architecture)
6. [Prompt Management](#prompt-management)
7. [Cost Optimization](#cost-optimization)

## Why integrate an LLM?

Currently, our system **simulates** reasoning in the `think()` method:

```typescript
// Current version (simulation)
private async think(input: string): Promise<AgentResponse> {
  // Basic parsing of input
  if (input.includes(‘calculate’)) {
    return { toolCalls: [{ toolName: ‘calculator’, ... }] };
  }
  // ...
}
```

With a **real LLM**, the agent can:
- ✅ Understand complex instructions in natural language
- ✅ Reason about which sequence of tools to use
- ✅ Generate natural conversational responses
- ✅ Adapt its strategy according to the context
- ✅ Learn from conversation history

## OpenAI Integration

### Installation

```bash
npm install openai
```

### Configuration

Create a `.env` file:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Implementation

Create `src/llm/openai-provider.ts`:

```typescript
import OpenAI from ‘openai’;
import { Message, MessageRole, ToolCall, AgentResponse } from ‘../types/agent.types’;
import { Tool } from ‘../types/agent.types’;

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = ‘gpt-4o-mini’) {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Converts our messages to OpenAI format
   */
  private convertMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: ‘system’, content: msg.content };
        case MessageRole.USER:
          return { role: ‘user’, content: msg.content };
        case MessageRole.ASSISTANT:
          return { role: ‘assistant’, content: msg.content };
        case MessageRole.TOOL:
          // OpenAI calls this ‘function’
          return {
            role: ‘function’ as any,
            name: msg.metadata?.toolName || ‘unknown’,
            content: msg.content
          };
        default:
          return { role: ‘user’, content: msg.content };
      }
    });
  }

  /**
   * Converts our tools to the OpenAI Function Calling format
   */
  private convertTools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: “function”,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: “object”,
          properties: tool.parameters.reduce((acc, param) => {
            acc[param.name] = {
              type: param.type,
              description: param.description
            };
            return acc;
          }, {} as Record<string, any>),
          required: tool.parameters
            .filter(p => p.required)
            .map(p => p.name)
        }
      }
    }));
  }

  /**
   * Call the OpenAI API to get a response
   */
  async complete(
    systemPrompt: string,
    conversationHistory: Message[],
    availableTools: Tool[],
    userInput: string
  ): Promise<AgentResponse> {
    // Build messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: ‘system’, content: systemPrompt },
      ...this.convertMessages(conversationHistory),
      { role: ‘user’, content: userInput }
    ];

    // Convert tools
    const tools = this.convertTools(availableTools);

    try {
      // Call to the API
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: ‘auto’, // The agent decides whether to use a tool
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Check if the agent wants to use tools
      const toolCalls: ToolCall[] = [];
      if (message.tool_calls) {
        for (const toolCall of message.tool_calls) {
          toolCalls.push({
            toolName: toolCall.function.name,
            parameters: JSON.parse(toolCall.function.arguments),
            reasoning: `LLM decided to use ${toolCall.function.name}`
          });
        }
      }

      return {
        message: message.content || ‘Processing...’,
        toolCalls,
        nextAction: choice.finish_reason === ‘stop’ ? 'complete' : ‘continue’,
        metadata: {
          model: this.model,
          tokens: response.usage
        }
      };
    } catch (error: any) {
      console.error(‘[OpenAI] Error:’, error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}
```

### Modify Agent.ts

Update the `think()` method:

```typescript
import { OpenAIProvider } from ‘../llm/openai-provider’;

export class Agent {
  private llmProvider?: OpenAIProvider;

  constructor(config: AgentConfig, toolRegistry: ToolRegistry, sessionId?: string) {
    // ... existing code ...

    // Initialize the LLM provider if API key available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.llmProvider = new OpenAIProvider(apiKey, process.env.OPENAI_MODEL);
    }
  }

  private async think(input: string): Promise<AgentResponse> {
    // If we have an LLM, use it
    if (this.llmProvider) {
      return await this.thinkWithLLM(input);
    }

    // Otherwise, fallback to simulation
    return this.thinkSimulated(input);
  }

  private async thinkWithLLM(input: string): Promise<AgentResponse> {
    console.log(‘[Agent] Thinking with LLM...’);

    // Retrieve available tools
    const tools = this.state.config.tools
      .map(name => this.toolRegistry.getTool(name))
      .filter(Boolean) as Tool[];

    // Call the LLM
    return await this.llmProvider!.complete(
      this.state.config.systemPrompt,
      this.state.context.messages,
      tools,
      input
    );
  }

  private thinkSimulated(input: string): AgentResponse {
    // The existing simulation...
  }
}
```

Example of use

```typescript
// Now your agent uses GPT!
const agent = new Agent(config, globalToolRegistry);

// The agent understands complex requests
await agent.execute(
  “Read the package.json file, calculate the total number of dependencies, and write the result to stats.txt”
);

// The LLM will:
// 1. Call read_file to read package.json
// 2. Count the dependencies
// 3. Call write_file to save
```

## Anthropic (Claude) Integration

### Installation

```bash
npm install @anthropic-ai/sdk
```

### Configuration

`.env`:
```env
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```

Implementation

src/llm/anthropic-provider.ts:

```typescript
import Anthropic from “@anthropic-ai/sdk”;
import { Message, MessageRole, ToolCall, AgentResponse } from “../types/agent.types”;
import { Tool } from “../types/agent.types”;

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = “claude-3-5-sonnet-20241022”) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter(m => m.role !== MessageRole.SYSTEM) // System separately
      .map(msg => {
        if (msg.role === MessageRole.TOOL) {
          return {
            role: “user” as const,
            content: [{
              type: “tool_result” as const,
              tool_use_id: msg.metadata?.toolId || “unknown”,
              content: msg.content
            }]
          };
        }

        return {
          role: msg.role === MessageRole.ASSISTANT ? “assistant” as const : “user” as const,
          content: msg.content
        };
      });
  }

  private convertTools(tools: Tool[]): Anthropic.Tool[] {
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.reduce((acc, param) => {
          acc[param.name] = {
            type: param.type,
            description: param.description
          };
          return acc;
        }, {} as Record<string, any>),
        required: tool.parameters
          .filter(p => p.required)
          .map(p => p.name)
      }
    }));
  }

  async complete(
    systemPrompt: string,
    conversationHistory: Message[],
    availableTools: Tool[],
    userInput: string
  ): Promise<AgentResponse> {
    const messages = [
      ...this.convertMessages(conversationHistory),
      { role: 'user' as const, content: userInput }
    ];

    const tools = this.convertTools(availableTools);

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined
      });

      const toolCalls: ToolCall[] = [];
      let messageContent = '';

      // Claude can return multiple content blocks
      for (const block of response.content) {
        if (block.type === 'text') {
          messageContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            toolName: block.name,
            parameters: block.input as Record<string, any>,
            reasoning: 'Claude decided to use this tool'
          });
        }
      }

      return {
        message: messageContent || 'Processing...',
        toolCalls,
        nextAction: response.stop_reason === 'end_turn' ? 'complete' : 'continue',
        metadata: {
          model: this.model,
          usage: response.usage
        }
      };
    } catch (error: any) {
      console.error('[Anthropic] Error:', error);
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }
}
```

## Integration Architecture

```
┌─────────────────────────────────────┐
│          Agent                      │
│                                     │
│  ┌───────────────────────── ──────┐ │
│  │   think()                     │ │
│  │   ↓                           │ │
│  │   thinkWithLLM()              │ │
│  └──────────┬────────────────────┘ │
│             │                       │
└─────────────┼───────────────────────┘
              │
    ┌─────────▼─────────┐
    │  LLM Provider     │
    │  (abstraction)    │
    └─────────┬─────────┘
              │
     ┌────────┴─────────┐
     │                  │
┌────▼ ─────┐    ┌──────▼──────┐
│ OpenAI   │    │ Anthropic   │
│ Provider │    │ Provider    │
└──────────┘    └─────────────┘
```

## Prompt Management

### Effective System Prompt

```typescript
const systemPrompt = `You are an autonomous agent with access to tools.

YOUR CAPABILITIES:
${toolDescriptions}

YOUR RULES:
1. Analyze the user request
2. Decide which tools to use and in what order
3. Execute the tools one by one
4. Synthesize the results
5. Respond clearly and concisely

IMPORTANT:
- ALWAYS use the available tools rather than inventing answers
- If you cannot do something, say so clearly
- Explain your reasoning
`;
```

### Prompt Engineering Tips

1. **Be specific**: “You can read files with read_file” > “You can interact with files”

2. **Give examples** (few-shot learning):
```typescript
const systemPrompt = `
EXAMPLES:

User: “How much is 2+2?”
Assistant: [uses calculator with expression="2+2"]

User: “Read config.json”
Assistant: [uses read_file with path="config.json"]
`;
```

3. **Structure the prompt**:
```typescript
const systemPrompt = `
IDENTITY: ${agentName}
PURPOSE: ${agentPurpose}

CAPABILITIES:
${toolList}

CONSTRAINTS:
${limitations}

EXAMPLES:
${examples}
`;
```

## Cost Optimization

### 1. Choose the right model

```typescript
// For simple tasks
const provider = new OpenAIProvider(apiKey, ‘gpt-4o-mini’); // 10x cheaper

// For complex tasks
const provider = new OpenAIProvider(apiKey, ‘gpt-4o’);
```

### 2. Limit the context

```typescript
// Keep only the last N messages
private getRelevantContext(maxMessages: number = 10): Message[] {
  return this.memory.getRecentMessages(maxMessages);
}
```

### 3. Caching (for Claude)

```typescript
// Claude supports prompt caching
const response = await this.client.messages.create({
  model: this.model,
  system: [
    {
      type: “text”,
      text: systemPrompt,
      cache_control: { type: “ephemeral” } // Cache this prompt
    }
  ],
  // ...
});
```

### 4. Streaming

For a better user experience:

```typescript
async completeStream(/* params */): AsyncGenerator<string> {
  const stream = await this.client.chat.completions.create({
    model: this.model,
    messages,
    stream: true
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
```

5. Cost Tracking

```typescript
class CostTracker {
  private totalTokens = 0;
  private totalCost = 0;

  track(usage: { prompt_tokens: number; completion_tokens: number }) {
    const cost = this.calculateCost(usage);
    this.totalTokens += usage.prompt_tokens + usage.completion_tokens;
    this.totalCost += cost;

    console.log(`💰 Cost: $${cost.toFixed(4)} | Total: $${this.totalCost.toFixed(2)}`);
  }

  private calculateCost(usage: any): number {
    // GPT-4o-mini: $0.15/1 million inputs, $0.60/1 million outputs
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }
}
```

## Debugging LLM Calls

### Log calls

```typescript
class LLMLogger {
  static logCall(messages: any[], tools: any[]) {
    console.log(“\n=== LLM CALL ===”);
    console.log(“Messages:”, JSON.stringify(messages, null, 2));
    console.log(“Tools:”, tools.map(t => t.name));
  }

  static logResponse(response: any) {
    console.log(“\n=== LLM RESPONSE ===”);
    console.log(“Content:”, response.message);
    console.log(“Tool calls:”, response.toolCalls);
    console.log(“Tokens:”, response.metadata?.usage);
  }
}
```
