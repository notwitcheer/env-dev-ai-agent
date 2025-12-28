/**
 * TOOL REGISTRY
 *
 * Le registre d'outils est comme une "boîte à outils" centralisée.
 * Les agents demandent des outils par nom, et le registre les fournit.
 *
 * POURQUOI C'EST IMPORTANT:
 * - Centralisation: Un seul endroit pour gérer tous les outils
 * - Sécurité: Validation et permissions avant exécution
 * - Extensibilité: Facile d'ajouter de nouveaux outils
 * - Découverte: Les agents peuvent lister les outils disponibles
 */

import { Tool, ToolResult, ToolParameter } from '../types/agent.types';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Enregistre un nouvel outil dans le système
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }

    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
    this.tools.set(tool.name, tool);
  }

  /**
   * Enregistre plusieurs outils d'un coup
   */
  registerMultiple(tools: Tool[]): void {
    tools.forEach(tool => this.register(tool));
  }

  /**
   * Récupère un outil par son nom
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Liste tous les outils disponibles
   * Utile pour que l'agent sache ce qu'il peut faire
   */
  listTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Obtenir les descriptions des outils (pour le prompt de l'agent)
   * L'agent reçoit cette liste pour savoir quels outils il peut utiliser
   */
  getToolDescriptions(toolNames?: string[]): string {
    const tools = toolNames
      ? toolNames.map(name => this.getTool(name)).filter(Boolean) as Tool[]
      : this.listTools();

    return tools
      .map(tool => {
        const params = tool.parameters
          .map(p => `  - ${p.name} (${p.type})${p.required ? ' *required*' : ''}: ${p.description}`)
          .join('\n');

        return `
### ${tool.name}
${tool.description}

Parameters:
${params}
`;
      })
      .join('\n---\n');
  }

  /**
   * Exécute un outil avec validation
   *
   * SÉCURITÉ:
   * 1. Vérifie que l'outil existe
   * 2. Valide les paramètres requis
   * 3. Valide le schéma Zod si fourni
   * 4. Exécute dans un try-catch pour gérer les erreurs
   */
  async executeTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    const tool = this.getTool(toolName);

    if (!tool) {
      return {
        success: false,
        error: `Tool "${toolName}" not found`,
      };
    }

    // Validation des paramètres requis
    const missingParams = tool.parameters
      .filter(p => p.required && !(p.name in parameters))
      .map(p => p.name);

    if (missingParams.length > 0) {
      return {
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`,
      };
    }

    // Validation avec Zod si un schéma est fourni
    for (const param of tool.parameters) {
      if (param.schema && param.name in parameters) {
        try {
          param.schema.parse(parameters[param.name]);
        } catch (error: any) {
          return {
            success: false,
            error: `Invalid parameter "${param.name}": ${error.message}`,
          };
        }
      }
    }

    // Exécution de l'outil
    try {
      console.log(`[ToolRegistry] Executing tool: ${toolName}`);
      const result = await tool.execute(parameters);
      return result;
    } catch (error: any) {
      console.error(`[ToolRegistry] Error executing ${toolName}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Vérifie si un outil existe
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Retire un outil du registre
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Compte le nombre d'outils enregistrés
   */
  get size(): number {
    return this.tools.size;
  }
}

// Instance singleton - un seul registre pour toute l'application
export const globalToolRegistry = new ToolRegistry();
