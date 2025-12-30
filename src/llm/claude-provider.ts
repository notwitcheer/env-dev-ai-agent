/**
 * CLAUDE LLM PROVIDER
 *
 * Intégration avec l'API Claude d'Anthropic.
 * Cette classe remplace le "thinking" simulé par de vrais appels LLM.
 */

import Anthropic from '@anthropic-ai/sdk';
import { Message, MessageRole, AgentResponse } from '../types/agent.types';
import { ToolRegistry } from '../core/tool-registry';

export interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ClaudeProvider {
  private anthropic: Anthropic;
  private config: ClaudeConfig;

  constructor(config: ClaudeConfig) {
    this.config = {
      model: 'claude-3-haiku-20240307',
      maxTokens: 4000,
      temperature: 0.1,
      ...config,
    };

    this.anthropic = new Anthropic({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Génère une réponse intelligente avec Claude
   */
  async think(
    systemPrompt: string,
    messages: Message[],
    availableTools: string[],
    toolRegistry: ToolRegistry,
    currentTask: string
  ): Promise<AgentResponse> {
    try {
      // Préparer les outils disponibles pour Claude
      const toolDescriptions = toolRegistry.getToolDescriptions(availableTools);

      // Construire le prompt système enrichi
      const enrichedSystemPrompt = `${systemPrompt}

OUTILS DISPONIBLES:
${toolDescriptions}

TOOL USAGE INSTRUCTIONS:
- Analyze the user's request
- Decide which tools to use (if needed)
- Respond in JSON format with this structure:
{
  "reasoning": "Your reasoning about the task",
  "message": "Your message for the user in English",
  "toolCalls": [
    {
      "toolName": "tool_name",
      "parameters": {"param1": "value1"},
      "reasoning": "Why use this tool"
    }
  ],
  "nextAction": "complete" | "continue" | "await_input"
}

If no tools are needed, leave toolCalls empty: []

IMPORTANT: Always respond to the user in English, regardless of the language they use to ask the question.`;

      // Convertir les messages pour Claude
      const claudeMessages = this.convertMessagesToClaude(messages);

      // Ajouter la tâche actuelle
      claudeMessages.push({
        role: 'user',
        content: currentTask,
      });

      console.log('[Claude] Sending request to Claude API...');

      const response = await this.anthropic.messages.create({
        model: this.config.model!,
        max_tokens: this.config.maxTokens!,
        temperature: this.config.temperature!,
        system: enrichedSystemPrompt,
        messages: claudeMessages,
      });

      // Parser la réponse de Claude
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      return this.parseClaudeResponse(content.text);

    } catch (error: any) {
      console.error('[Claude] Error:', error);
      return {
        message: `Erreur Claude: ${error.message}`,
        nextAction: 'complete',
      };
    }
  }

  /**
   * Convertit nos messages vers le format Claude
   */
  private convertMessagesToClaude(messages: Message[]): Anthropic.MessageParam[] {
    return messages
      .filter(msg => msg.role !== MessageRole.SYSTEM) // Le system prompt est géré séparément
      .map(msg => ({
        role: msg.role === MessageRole.USER ? 'user' : 'assistant',
        content: msg.content,
      }));
  }

  /**
   * Parse la réponse JSON de Claude
   */
  private parseClaudeResponse(responseText: string): AgentResponse {
    try {
      // Essayer de parser le JSON
      let jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Si pas de JSON, retourner une réponse simple
        return {
          message: responseText,
          nextAction: 'complete',
        };
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validation et nettoyage
      const response: AgentResponse = {
        message: parsed.message || responseText,
        toolCalls: Array.isArray(parsed.toolCalls) ? parsed.toolCalls : [],
        nextAction: parsed.nextAction || 'complete',
        metadata: {
          reasoning: parsed.reasoning,
          rawResponse: responseText,
        },
      };

      console.log('[Claude] Parsed response:', {
        message: response.message,
        toolCallsCount: response.toolCalls?.length || 0,
        nextAction: response.nextAction,
      });

      return response;

    } catch (error) {
      console.warn('[Claude] Failed to parse JSON response, using raw text');
      return {
        message: responseText,
        nextAction: 'complete',
      };
    }
  }
}