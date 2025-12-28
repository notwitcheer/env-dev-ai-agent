/**
 * Types fondamentaux pour le système d'agents
 *
 * CONCEPTS CLÉS:
 * - Message: Communication entre agents/utilisateur
 * - Tool: Capacité/action qu'un agent peut exécuter
 * - Context: État et informations disponibles pour un agent
 * - Agent: Entité autonome qui exécute des tâches
 */

import { z } from 'zod';

/**
 * MESSAGE SYSTEM
 * Les agents communiquent via des messages structurés
 */
export enum MessageRole {
  SYSTEM = 'system',    // Instructions système
  USER = 'user',        // Input utilisateur
  ASSISTANT = 'assistant', // Réponse de l'agent
  TOOL = 'tool',        // Résultat d'un outil
}

export interface Message {
  role: MessageRole;
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

/**
 * TOOL SYSTEM
 * Les outils sont les "mains" des agents - ce qu'ils peuvent faire
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  schema?: z.ZodSchema; // Validation Zod pour sécurité
}

export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute: (params: Record<string, any>) => Promise<ToolResult>;
  // Permissions - certains outils peuvent être dangereux
  requiresPermission?: boolean;
  permissionLevel?: 'read' | 'write' | 'execute' | 'admin';
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * CONTEXT SYSTEM
 * Le contexte donne à l'agent la "vision" de sa situation
 */
export interface AgentContext {
  // Historique de conversation
  messages: Message[];

  // Variables d'environnement et config
  environment: Record<string, any>;

  // Outils disponibles pour cet agent
  availableTools: string[]; // Names of tools

  // Mémoire à court terme (dans cette session)
  workingMemory: Record<string, any>;

  // ID de session pour tracking
  sessionId: string;

  // Parent agent si c'est un subagent
  parentAgentId?: string;
}

/**
 * AGENT CONFIGURATION
 * Définit le comportement et les capacités d'un agent
 */
export interface AgentConfig {
  // Identité
  name: string;
  description: string;

  // Prompt système - définit la personnalité et les règles
  systemPrompt: string;

  // Outils auxquels cet agent a accès
  tools: string[]; // Tool names

  // Modes de fonctionnement
  mode?: 'autonomous' | 'interactive' | 'planning';

  // Peut-il créer des subagents?
  canSpawnSubagents?: boolean;

  // Limites de sécurité
  maxIterations?: number; // Évite les boucles infinies
  maxSubagents?: number;

  // Configuration de mémoire
  memoryConfig?: {
    enabled: boolean;
    persistToDisk?: boolean;
    memoryPath?: string;
  };
}

/**
 * AGENT STATE
 * L'état courant d'un agent en exécution
 */
export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING_TOOL = 'executing_tool',
  WAITING_FOR_INPUT = 'waiting_for_input',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface AgentState {
  id: string;
  config: AgentConfig;
  context: AgentContext;
  status: AgentStatus;
  currentTask?: string;

  // Subagents actifs
  subagents: Map<string, AgentState>;

  // Métriques
  iterations: number;
  startTime: Date;
  endTime?: Date;
}

/**
 * AGENT RESPONSE
 * Ce qu'un agent retourne après traitement
 */
export interface AgentResponse {
  message: string;
  toolCalls?: ToolCall[];
  nextAction?: 'continue' | 'await_input' | 'spawn_subagent' | 'complete';
  metadata?: Record<string, any>;
}

export interface ToolCall {
  toolName: string;
  parameters: Record<string, any>;
  reasoning?: string; // Pourquoi l'agent appelle cet outil
}
