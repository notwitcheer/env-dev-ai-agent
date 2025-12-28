/**
 * AGENT CORE
 *
 * C'est le cœur du système d'agents.
 * Un Agent est une entité autonome qui peut:
 * 1. Recevoir des tâches
 * 2. Raisonner sur comment les accomplir
 * 3. Utiliser des outils
 * 4. Créer des subagents pour déléguer
 * 5. Maintenir un état et une mémoire
 *
 * ARCHITECTURE:
 *
 *   User Input
 *       ↓
 *   [Agent.execute()]
 *       ↓
 *   Think (raisonnement)
 *       ↓
 *   Decide (décider quoi faire)
 *       ↓
 *   Act (utiliser des outils)
 *       ↓
 *   Update State (mettre à jour l'état)
 *       ↓
 *   Return Response
 *
 * POUR LA DEMO:
 * Dans cette version, nous simulons le "raisonnement" de l'agent.
 * En production, vous brancheriez un LLM (OpenAI, Claude, etc.)
 */

import { randomUUID } from 'crypto';
import {
  AgentConfig,
  AgentState,
  AgentStatus,
  AgentContext,
  AgentResponse,
  Message,
  MessageRole,
  ToolCall,
} from '../types/agent.types';
import { ToolRegistry } from './tool-registry';
import { MemoryManager } from '../memory/memory-manager';

export class Agent {
  private state: AgentState;
  private toolRegistry: ToolRegistry;
  private memory: MemoryManager;

  constructor(
    config: AgentConfig,
    toolRegistry: ToolRegistry,
    sessionId?: string
  ) {
    this.toolRegistry = toolRegistry;

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

    console.log(`[Agent] Created agent: ${config.name} (${agentId})`);
  }

  /**
   * Point d'entrée principal - exécute une tâche
   */
  async execute(userInput: string): Promise<AgentResponse> {
    console.log(`\n[Agent] Executing task: "${userInput}"\n`);

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

    try {
      // Dans une vraie implémentation, ici on appellerait un LLM
      // Pour cette démo, on va simuler le raisonnement
      const response = await this.think(userInput);

      // Si l'agent veut utiliser des outils
      if (response.toolCalls && response.toolCalls.length > 0) {
        await this.executeTools(response.toolCalls);
      }

      // Marquer comme complété
      this.state.status = AgentStatus.COMPLETED;
      this.state.endTime = new Date();

      return response;
    } catch (error: any) {
      this.state.status = AgentStatus.ERROR;
      console.error('[Agent] Error during execution:', error);

      return {
        message: `Error: ${error.message}`,
        nextAction: 'complete',
      };
    }
  }

  /**
   * THINK - Raisonnement de l'agent
   *
   * C'est ici qu'en production, vous brancheriez un LLM.
   * Le LLM recevrait:
   * - Le system prompt
   * - L'historique de conversation
   * - La liste des outils disponibles
   * - La tâche courante
   *
   * Et retournerait:
   * - Un message de réponse
   * - Des appels d'outils à exécuter
   */
  private async think(input: string): Promise<AgentResponse> {
    console.log('[Agent] Thinking...');

    // Pour la démo, on va parser l'input et décider quoi faire
    // En production, un LLM ferait ce raisonnement

    const response: AgentResponse = {
      message: '',
      toolCalls: [],
      nextAction: 'complete',
    };

    // Analyse simple de l'input pour décider des outils
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('calculate') || lowerInput.includes('calcul')) {
      // Extraire l'expression mathématique
      const match = input.match(/calculate\s+(.+)/i) || input.match(/calcul\s+(.+)/i);
      if (match) {
        response.toolCalls = [{
          toolName: 'calculator',
          parameters: { expression: match[1].trim() },
          reasoning: 'User asked for a calculation',
        }];
        response.message = 'Calculating the expression...';
      }
    } else if (lowerInput.includes('read file') || lowerInput.includes('lire')) {
      const match = input.match(/(?:read file|lire)\s+(.+)/i);
      if (match) {
        response.toolCalls = [{
          toolName: 'read_file',
          parameters: { path: match[1].trim() },
          reasoning: 'User wants to read a file',
        }];
        response.message = 'Reading the file...';
      }
    } else if (lowerInput.includes('list') || lowerInput.includes('liste')) {
      const match = input.match(/(?:list|liste)\s+(.+)/i);
      if (match) {
        response.toolCalls = [{
          toolName: 'list_directory',
          parameters: { path: match[1].trim() },
          reasoning: 'User wants to list directory contents',
        }];
        response.message = 'Listing directory contents...';
      }
    } else if (lowerInput.includes('time') || lowerInput.includes('heure')) {
      response.toolCalls = [{
        toolName: 'get_timestamp',
        parameters: { format: 'readable' },
        reasoning: 'User wants to know the current time',
      }];
      response.message = 'Getting current timestamp...';
    } else {
      // Réponse par défaut
      response.message = `I understand you want: "${input}". ` +
        `Available tools: ${this.state.config.tools.join(', ')}. ` +
        `Try asking me to "calculate 2+2" or "list ." or "get time"`;
    }

    return response;
  }

  /**
   * EXECUTE TOOLS - Exécute les outils demandés
   */
  private async executeTools(toolCalls: ToolCall[]): Promise<void> {
    this.state.status = AgentStatus.EXECUTING_TOOL;

    for (const call of toolCalls) {
      console.log(`[Agent] Executing tool: ${call.toolName}`);
      console.log(`[Agent] Parameters:`, call.parameters);
      if (call.reasoning) {
        console.log(`[Agent] Reasoning: ${call.reasoning}`);
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
        },
        timestamp: new Date(),
      };
      this.memory.addMessage(toolMessage);
      this.state.context.messages.push(toolMessage);

      console.log(`[Agent] Tool result:`, result.success ? '✓ Success' : '✗ Failed');
      if (result.data) {
        console.log('[Agent] Data:', JSON.stringify(result.data, null, 2));
      }
      if (result.error) {
        console.error('[Agent] Error:', result.error);
      }
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
   * SPAWN SUBAGENT - Créer un sous-agent
   *
   * Les subagents sont utiles pour déléguer des tâches spécialisées.
   * Par exemple, un agent principal peut créer:
   * - Un subagent pour analyser du code
   * - Un subagent pour chercher sur le web
   * - Un subagent pour générer des tests
   */
  async spawnSubagent(
    config: AgentConfig,
    task: string
  ): Promise<AgentResponse> {
    if (!this.state.config.canSpawnSubagents) {
      throw new Error('This agent is not allowed to spawn subagents');
    }

    const maxSubagents = this.state.config.maxSubagents || 5;
    if (this.state.subagents.size >= maxSubagents) {
      throw new Error(`Maximum number of subagents (${maxSubagents}) reached`);
    }

    console.log(`[Agent] Spawning subagent: ${config.name}`);

    // Créer le subagent avec le même registre d'outils
    const subagent = new Agent(config, this.toolRegistry, this.state.context.sessionId);

    // L'exécuter
    const result = await subagent.execute(task);

    // Stocker son état
    this.state.subagents.set(subagent.state.id, subagent.getState());

    return result;
  }

  /**
   * UPDATE CONTEXT - Mise à jour du contexte
   */
  updateContext(updates: Partial<AgentContext>): void {
    this.state.context = {
      ...this.state.context,
      ...updates,
    };
  }

  /**
   * PERSIST - Sauvegarder l'état de l'agent
   */
  async persist(): Promise<void> {
    if (this.state.config.memoryConfig?.persistToDisk) {
      await this.memory.persist();
      console.log('[Agent] State persisted to disk');
    }
  }
}
