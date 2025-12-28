# 🧠 Intégration LLM - Guide Complet

Ce guide explique comment intégrer un vrai LLM (Large Language Model) dans votre système d'agents.

## 📋 Table des Matières

1. [Pourquoi intégrer un LLM?](#pourquoi-intégrer-un-llm)
2. [Options disponibles](#options-disponibles)
3. [Intégration OpenAI](#intégration-openai)
4. [Intégration Anthropic (Claude)](#intégration-anthropic-claude)
5. [Architecture de l'intégration](#architecture-de-lintégration)
6. [Gestion des prompts](#gestion-des-prompts)
7. [Optimisation des coûts](#optimisation-des-coûts)

## Pourquoi intégrer un LLM?

Actuellement, notre système **simule** le raisonnement dans la méthode `think()`:

```typescript
// Version actuelle (simulation)
private async think(input: string): Promise<AgentResponse> {
  // Parse basique de l'input
  if (input.includes('calculate')) {
    return { toolCalls: [{ toolName: 'calculator', ... }] };
  }
  // ...
}
```

Avec un **vrai LLM**, l'agent peut:
- ✅ Comprendre des instructions complexes en langage naturel
- ✅ Raisonner sur quelle séquence d'outils utiliser
- ✅ Générer des réponses conversationnelles naturelles
- ✅ Adapter sa stratégie selon le contexte
- ✅ Apprendre de l'historique de conversation

## Options disponibles

| Provider | Modèle | Prix | Avantages | Use Case |
|----------|--------|------|-----------|----------|
| **OpenAI** | GPT-4o | $$$ | Très performant, tool calling natif | Production, tâches complexes |
| **OpenAI** | GPT-4o-mini | $ | Bon rapport qualité/prix | Développement, tâches simples |
| **Anthropic** | Claude 3.5 Sonnet | $$ | Excellent raisonnement, long context | Analyse, coding |
| **Anthropic** | Claude 3 Haiku | $ | Rapide et économique | Tâches simples, high volume |
| **Google** | Gemini Pro | $$ | Multimodal, bon contexte | Vision + text |
| **Local** | Ollama (Llama 3) | Gratuit | Privé, offline | Privacy-critical |

## Intégration OpenAI

### Installation

```bash
npm install openai
```

### Configuration

Créez un fichier `.env`:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

### Implémentation

Créez `src/llm/openai-provider.ts`:

```typescript
import OpenAI from 'openai';
import { Message, MessageRole, ToolCall, AgentResponse } from '../types/agent.types';
import { Tool } from '../types/agent.types';

export class OpenAIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  /**
   * Convertit nos messages au format OpenAI
   */
  private convertMessages(messages: Message[]): OpenAI.ChatCompletionMessageParam[] {
    return messages.map(msg => {
      switch (msg.role) {
        case MessageRole.SYSTEM:
          return { role: 'system', content: msg.content };
        case MessageRole.USER:
          return { role: 'user', content: msg.content };
        case MessageRole.ASSISTANT:
          return { role: 'assistant', content: msg.content };
        case MessageRole.TOOL:
          // OpenAI appelle ça 'function'
          return {
            role: 'function' as any,
            name: msg.metadata?.toolName || 'unknown',
            content: msg.content
          };
        default:
          return { role: 'user', content: msg.content };
      }
    });
  }

  /**
   * Convertit nos tools au format OpenAI Function Calling
   */
  private convertTools(tools: Tool[]): OpenAI.ChatCompletionTool[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
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
      }
    }));
  }

  /**
   * Appelle l'API OpenAI pour obtenir une réponse
   */
  async complete(
    systemPrompt: string,
    conversationHistory: Message[],
    availableTools: Tool[],
    userInput: string
  ): Promise<AgentResponse> {
    // Construire les messages
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...this.convertMessages(conversationHistory),
      { role: 'user', content: userInput }
    ];

    // Convertir les outils
    const tools = this.convertTools(availableTools);

    try {
      // Appel à l'API
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: 'auto', // L'agent décide s'il utilise un outil
      });

      const choice = response.choices[0];
      const message = choice.message;

      // Vérifier si l'agent veut utiliser des outils
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
        message: message.content || 'Processing...',
        toolCalls,
        nextAction: choice.finish_reason === 'stop' ? 'complete' : 'continue',
        metadata: {
          model: this.model,
          tokens: response.usage
        }
      };
    } catch (error: any) {
      console.error('[OpenAI] Error:', error);
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }
}
```

### Modifier Agent.ts

Mettez à jour la méthode `think()`:

```typescript
import { OpenAIProvider } from '../llm/openai-provider';

export class Agent {
  private llmProvider?: OpenAIProvider;

  constructor(config: AgentConfig, toolRegistry: ToolRegistry, sessionId?: string) {
    // ... existing code ...

    // Initialiser le LLM provider si API key disponible
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.llmProvider = new OpenAIProvider(apiKey, process.env.OPENAI_MODEL);
    }
  }

  private async think(input: string): Promise<AgentResponse> {
    // Si on a un LLM, l'utiliser
    if (this.llmProvider) {
      return await this.thinkWithLLM(input);
    }

    // Sinon, fallback sur la simulation
    return this.thinkSimulated(input);
  }

  private async thinkWithLLM(input: string): Promise<AgentResponse> {
    console.log('[Agent] Thinking with LLM...');

    // Récupérer les outils disponibles
    const tools = this.state.config.tools
      .map(name => this.toolRegistry.getTool(name))
      .filter(Boolean) as Tool[];

    // Appeler le LLM
    return await this.llmProvider!.complete(
      this.state.config.systemPrompt,
      this.state.context.messages,
      tools,
      input
    );
  }

  private thinkSimulated(input: string): AgentResponse {
    // La simulation existante...
  }
}
```

### Exemple d'utilisation

```typescript
// Maintenant votre agent utilise GPT!
const agent = new Agent(config, globalToolRegistry);

// L'agent comprend des requêtes complexes
await agent.execute(
  "Lis le fichier package.json, calcule le nombre total de dépendances, et écris le résultat dans stats.txt"
);

// Le LLM va:
// 1. Appeler read_file pour lire package.json
// 2. Compter les dépendances
// 3. Appeler write_file pour sauvegarder
```

## Intégration Anthropic (Claude)

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

### Implémentation

`src/llm/anthropic-provider.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Message, MessageRole, ToolCall, AgentResponse } from '../types/agent.types';
import { Tool } from '../types/agent.types';

export class AnthropicProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  private convertMessages(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter(m => m.role !== MessageRole.SYSTEM) // System va séparément
      .map(msg => {
        if (msg.role === MessageRole.TOOL) {
          return {
            role: 'user' as const,
            content: [{
              type: 'tool_result' as const,
              tool_use_id: msg.metadata?.toolId || 'unknown',
              content: msg.content
            }]
          };
        }

        return {
          role: msg.role === MessageRole.ASSISTANT ? 'assistant' as const : 'user' as const,
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

      // Claude peut retourner plusieurs content blocks
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

## Architecture de l'intégration

```
┌─────────────────────────────────────┐
│          Agent                      │
│                                     │
│  ┌───────────────────────────────┐ │
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
┌────▼─────┐    ┌──────▼──────┐
│ OpenAI   │    │ Anthropic   │
│ Provider │    │ Provider    │
└──────────┘    └─────────────┘
```

## Gestion des Prompts

### System Prompt Efficace

```typescript
const systemPrompt = `Tu es un agent autonome avec accès à des outils.

TES CAPACITÉS:
${toolDescriptions}

TES RÈGLES:
1. Analyse la demande utilisateur
2. Décide quels outils utiliser et dans quel ordre
3. Exécute les outils un par un
4. Synthétise les résultats
5. Réponds de manière claire et concise

IMPORTANT:
- Utilise TOUJOURS les outils disponibles plutôt que d'inventer des réponses
- Si tu ne peux pas faire quelque chose, dis-le clairement
- Explique ton raisonnement
`;
```

### Prompt Engineering Tips

1. **Sois spécifique**: "Tu peux lire des fichiers avec read_file" > "Tu peux interagir avec des fichiers"

2. **Donne des exemples** (few-shot learning):
```typescript
const systemPrompt = `
EXEMPLES:

User: "Combien font 2+2?"
Assistant: [utilise calculator avec expression="2+2"]

User: "Lis config.json"
Assistant: [utilise read_file avec path="config.json"]
`;
```

3. **Structure le prompt**:
```typescript
const systemPrompt = `
IDENTITÉ: ${agentName}
OBJECTIF: ${agentPurpose}

CAPACITÉS:
${toolList}

CONTRAINTES:
${limitations}

EXEMPLES:
${examples}
`;
```

## Optimisation des Coûts

### 1. Choisir le bon modèle

```typescript
// Pour tâches simples
const provider = new OpenAIProvider(apiKey, 'gpt-4o-mini'); // 10x moins cher

// Pour tâches complexes
const provider = new OpenAIProvider(apiKey, 'gpt-4o');
```

### 2. Limiter le contexte

```typescript
// Garder seulement les N derniers messages
private getRelevantContext(maxMessages: number = 10): Message[] {
  return this.memory.getRecentMessages(maxMessages);
}
```

### 3. Caching (pour Claude)

```typescript
// Claude supporte le prompt caching
const response = await this.client.messages.create({
  model: this.model,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' } // Cache ce prompt
    }
  ],
  // ...
});
```

### 4. Streaming

Pour de meilleures UX:

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

### 5. Monitoring des coûts

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
    // GPT-4o-mini: $0.15/1M input, $0.60/1M output
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }
}
```

## Exemple Complet

`src/examples/llm-agent.ts`:

```typescript
import { Agent } from '../core/agent';
import { globalToolRegistry } from '../core/tool-registry';
import { fileTools } from '../tools/file-tools';
import { utilityTools } from '../tools/utility-tools';
import 'dotenv/config';

async function main() {
  // Setup
  globalToolRegistry.registerMultiple([...fileTools, ...utilityTools]);

  const config = {
    name: 'IntelligentAssistant',
    description: 'An AI agent powered by GPT-4',
    systemPrompt: `Tu es un assistant intelligent avec accès à des outils.

Outils disponibles:
${globalToolRegistry.getToolDescriptions()}

Utilise ces outils pour répondre aux demandes de l'utilisateur de manière efficace.`,
    tools: ['read_file', 'write_file', 'calculator', 'get_timestamp'],
    mode: 'autonomous' as const,
    memoryConfig: { enabled: true }
  };

  const agent = new Agent(config, globalToolRegistry);

  // Test avec une requête complexe
  console.log('=== Test: Complex multi-step task ===\n');

  const response = await agent.execute(`
    Lis le fichier package.json, compte le nombre total de dépendances
    (dependencies + devDependencies), multiplie ce nombre par 2,
    et écris le résultat dans un fichier result.txt
  `);

  console.log('\nAgent response:', response.message);

  // L'agent devrait:
  // 1. read_file("package.json")
  // 2. calculator("nombre_deps * 2")
  // 3. write_file("result.txt", "résultat")
}

main().catch(console.error);
```

## Debugging LLM Calls

### Logger les prompts

```typescript
class LLMLogger {
  static logCall(messages: any[], tools: any[]) {
    console.log('\n=== LLM CALL ===');
    console.log('Messages:', JSON.stringify(messages, null, 2));
    console.log('Tools:', tools.map(t => t.name));
  }

  static logResponse(response: any) {
    console.log('\n=== LLM RESPONSE ===');
    console.log('Content:', response.message);
    console.log('Tool calls:', response.toolCalls);
    console.log('Tokens:', response.metadata?.usage);
  }
}
```

## Conclusion

Avec un LLM intégré, vos agents deviennent **vraiment** intelligents:

- ✅ Comprennent le langage naturel
- ✅ Raisonnent sur des tâches complexes
- ✅ Chaînent des outils intelligemment
- ✅ S'adaptent au contexte

**Next steps**:
1. Choisissez votre provider (OpenAI ou Anthropic)
2. Implémentez le provider
3. Modifiez `Agent.think()`
4. Testez avec des requêtes complexes
5. Optimisez les prompts et coûts

Happy LLM integration! 🧠✨
