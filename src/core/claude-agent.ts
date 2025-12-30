/**
 * CLAUDE AGENT
 *
 * Agent avancé qui utilise vraiment Claude pour le raisonnement,
 * spécialisé pour les recherches DeFi et crypto.
 */

import { randomUUID } from 'crypto';
import {
  AgentConfig,
  AgentState,
  AgentStatus,
  AgentResponse,
  Message,
  MessageRole,
} from '../types/agent.types';
import { ToolRegistry } from './tool-registry';
import { MemoryManager } from '../memory/memory-manager';
import { ClaudeProvider, ClaudeConfig } from '../llm/claude-provider';

export class ClaudeAgent {
  private state: AgentState;
  private toolRegistry: ToolRegistry;
  private memory: MemoryManager;
  private claudeProvider: ClaudeProvider;

  constructor(
    config: AgentConfig,
    toolRegistry: ToolRegistry,
    claudeConfig: ClaudeConfig,
    sessionId?: string
  ) {
    this.toolRegistry = toolRegistry;
    this.claudeProvider = new ClaudeProvider(claudeConfig);

    // Génère un ID unique pour cet agent
    const agentId = randomUUID();
    const session = sessionId || randomUUID();

    // Initialize memory
    this.memory = new MemoryManager(session, config.memoryConfig?.memoryPath);

    // Initialize agent state
    this.state = {
      id: agentId,
      config,
      status: AgentStatus.IDLE,
      iterations: 0,
      startTime: new Date(),
      subagents: new Map(),
      context: {
        messages: [],
        environment: {},
        availableTools: config.tools,
        workingMemory: {},
        sessionId: session,
      },
    };

    console.log(`[ClaudeAgent] Created agent: ${config.name} (${agentId})`);
  }

  /**
   * Point d'entrée principal - exécute une tâche avec Claude
   */
  async execute(userInput: string): Promise<AgentResponse> {
    console.log(`\n[ClaudeAgent] 🤖 Executing task: "${userInput}"\n`);

    // Ajouter le message utilisateur
    const userMessage: Message = {
      role: MessageRole.USER,
      content: userInput,
      timestamp: new Date(),
    };
    this.memory.addMessage(userMessage);
    this.state.context.messages.push(userMessage);

    // Loop principal de l'agent
    this.state.status = AgentStatus.THINKING;
    this.state.currentTask = userInput;
    this.state.iterations++;

    try {
      console.log('[ClaudeAgent] 🧠 Thinking with Claude...');

      // Utiliser Claude pour le raisonnement
      const response = await this.claudeProvider.think(
        this.state.config.systemPrompt,
        this.state.context.messages,
        this.state.config.tools,
        this.toolRegistry,
        userInput
      );

      // Si Claude veut utiliser des outils
      if (response.toolCalls && response.toolCalls.length > 0) {
        console.log(`[ClaudeAgent] 🔧 Executing ${response.toolCalls.length} tool(s)...`);
        await this.executeTools(response.toolCalls);

        // Après exécution des outils, demander à Claude de résumer
        const summaryResponse = await this.generateSummary(response, userInput);
        response.message = summaryResponse.message;
      }

      // Ajouter la réponse de l'agent aux messages
      const assistantMessage: Message = {
        role: MessageRole.ASSISTANT,
        content: response.message,
        timestamp: new Date(),
        metadata: {
          reasoning: response.metadata?.reasoning,
          toolCalls: response.toolCalls,
        },
      };
      this.memory.addMessage(assistantMessage);
      this.state.context.messages.push(assistantMessage);

      // Marquer comme complété
      this.state.status = AgentStatus.COMPLETED;
      this.state.endTime = new Date();

      console.log(`[ClaudeAgent] ✅ Task completed successfully`);
      return response;

    } catch (error: any) {
      this.state.status = AgentStatus.ERROR;
      console.error('[ClaudeAgent] ❌ Error during execution:', error);

      return {
        message: `❌ Erreur: ${error.message}`,
        nextAction: 'complete',
      };
    }
  }

  /**
   * EXECUTE TOOLS - Exécute les outils demandés par Claude
   */
  private async executeTools(toolCalls: any[]): Promise<void> {
    this.state.status = AgentStatus.EXECUTING_TOOL;

    for (const call of toolCalls) {
      console.log(`[ClaudeAgent] 🔧 Executing tool: ${call.toolName}`);
      console.log(`[ClaudeAgent] 📋 Parameters:`, JSON.stringify(call.parameters, null, 2));

      if (call.reasoning) {
        console.log(`[ClaudeAgent] 💭 Reasoning: ${call.reasoning}`);
      }

      const result = await this.toolRegistry.executeTool(
        call.toolName,
        call.parameters
      );

      // Enregistrer le résultat en mémoire
      this.memory.set(`tool_result_${call.toolName}`, result);

      // Ajouter le résultat aux messages
      const toolMessage: Message = {
        role: MessageRole.TOOL,
        content: JSON.stringify(result, null, 2),
        metadata: {
          toolName: call.toolName,
          parameters: call.parameters,
          reasoning: call.reasoning,
        },
        timestamp: new Date(),
      };
      this.memory.addMessage(toolMessage);
      this.state.context.messages.push(toolMessage);

      console.log(`[ClaudeAgent] 📊 Tool result:`, result.success ? '✅ Success' : '❌ Failed');

      if (result.success && result.data) {
        console.log('[ClaudeAgent] 📈 Data preview:',
          JSON.stringify(result.data, null, 2).substring(0, 200) + '...');
      }

      if (!result.success && result.error) {
        console.error('[ClaudeAgent] ⚠️  Error:', result.error);
      }
    }
  }

  /**
   * Demande à Claude de faire un résumé après exécution des outils
   */
  private async generateSummary(originalResponse: AgentResponse, userInput: string): Promise<AgentResponse> {
    try {
      const summaryPrompt = `The user asked: "${userInput}"

I have successfully executed the following tools:
${originalResponse.toolCalls?.map(call => `- ${call.toolName}: ${call.reasoning}`).join('\n')}

The results are now in the message history (role 'tool').

Analyze these results and provide a complete and useful response to the user in English.
Highlight the most important information for their DeFi research.

Respond directly without JSON format.`;

      const summaryResponse = await this.claudeProvider.think(
        'You are a DeFi expert who analyzes data to provide useful insights. Always respond in English.',
        this.state.context.messages,
        [],
        this.toolRegistry,
        summaryPrompt
      );

      return summaryResponse;
    } catch (error) {
      console.warn('[ClaudeAgent] Could not generate summary, using original response');
      return originalResponse;
    }
  }

  /**
   * GET STATE - Obtenir l'état actuel de l'agent
   */
  getState(): AgentState {
    return { ...this.state };
  }

  /**
   * GET MEMORY - Accès à la mémoire
   */
  getMemory(): MemoryManager {
    return this.memory;
  }

  /**
   * SPAWN SUBAGENT - Créer un sous-agent spécialisé
   */
  async spawnSubagent(
    config: AgentConfig,
    task: string,
    claudeConfig?: ClaudeConfig
  ): Promise<AgentResponse> {
    if (!this.state.config.canSpawnSubagents) {
      throw new Error('This agent is not allowed to spawn subagents');
    }

    const maxSubagents = this.state.config.maxSubagents || 5;
    if (this.state.subagents.size >= maxSubagents) {
      throw new Error(`Maximum number of subagents (${maxSubagents}) reached`);
    }

    console.log(`[ClaudeAgent] 🚀 Spawning subagent: ${config.name}`);

    // Créer le subagent avec la même config Claude ou une nouvelle
    const subagentClaudeConfig = claudeConfig || {
      apiKey: process.env.ANTHROPIC_API_KEY!,
      model: 'claude-3-5-sonnet-20241022',
    };

    const subagent = new ClaudeAgent(
      config,
      this.toolRegistry,
      subagentClaudeConfig,
      this.state.context.sessionId
    );

    // L'exécuter
    const result = await subagent.execute(task);

    // Stocker son état
    this.state.subagents.set(subagent.state.id, subagent.getState());

    return result;
  }

  /**
   * PERSIST - Sauvegarder l'état de l'agent
   */
  async persist(): Promise<void> {
    if (this.state.config.memoryConfig?.persistToDisk) {
      await this.memory.persist();
      console.log('[ClaudeAgent] 💾 State persisted to disk');
    }
  }

  /**
   * LOAD MEMORY - Charger la mémoire depuis le disque
   */
  async loadMemory(): Promise<void> {
    if (this.state.config.memoryConfig?.persistToDisk) {
      await this.memory.load();
      console.log('[ClaudeAgent] 📂 Memory loaded from disk');
    }
  }
}