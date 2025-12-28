# 🚀 Concepts Avancés - MCP, Skills, Hooks & More

Ce guide explore les concepts avancés pour étendre votre système d'agents.

## 📋 Table des Matières

1. [Model Context Protocol (MCP)](#model-context-protocol-mcp)
2. [Skills & Slash Commands](#skills--slash-commands)
3. [Hooks & Events](#hooks--events)
4. [Plugin System](#plugin-system)
5. [LSP Integration](#lsp-integration)
6. [Workflow Builder](#workflow-builder)

---

## Model Context Protocol (MCP)

### Qu'est-ce que MCP?

Le **Model Context Protocol** est un standard pour connecter des sources de données externes aux agents IA.

**Concept**: Au lieu d'avoir des outils codés en dur, MCP permet de:
- 📡 Se connecter à des APIs dynamiquement
- 🔌 Brancher des sources de données (Notion, GitHub, databases...)
- 🔄 Partager des contextes entre agents

### Architecture MCP

```
┌─────────────────────────────────────┐
│          Agent                      │
└──────────────┬──────────────────────┘
               │
      ┌────────▼─────────┐
      │   MCP Client     │
      └────────┬─────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼───────┐    ┌───────▼────┐
│ MCP Server│    │ MCP Server │
│  (GitHub) │    │  (Notion)  │
└───────────┘    └────────────┘
```

### Implémentation MCP

Créons un système de MCP servers:

#### Types MCP (`src/mcp/mcp-types.ts`)

```typescript
/**
 * MCP Resource - Une source de données accessible
 */
export interface MCPResource {
  uri: string;           // e.g., "notion://page/123"
  name: string;
  description: string;
  mimeType?: string;
}

/**
 * MCP Tool - Un outil exposé par un serveur MCP
 */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>; // JSON Schema
}

/**
 * MCP Server - Un serveur qui expose ressources et outils
 */
export interface MCPServer {
  name: string;
  version: string;

  // Capacités
  capabilities: {
    resources?: boolean;
    tools?: boolean;
    prompts?: boolean;
  };

  // Méthodes
  listResources(): Promise<MCPResource[]>;
  readResource(uri: string): Promise<string>;
  listTools(): Promise<MCPTool[]>;
  callTool(name: string, params: any): Promise<any>;
}
```

#### GitHub MCP Server (`src/mcp/servers/github-mcp.ts`)

```typescript
import { Octokit } from '@octokit/rest';
import { MCPServer, MCPResource, MCPTool } from '../mcp-types';

export class GitHubMCPServer implements MCPServer {
  name = 'github';
  version = '1.0.0';
  capabilities = { resources: true, tools: true };

  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async listResources(): Promise<MCPResource[]> {
    // Liste les repos de l'utilisateur
    const { data: repos } = await this.octokit.repos.listForAuthenticatedUser();

    return repos.map(repo => ({
      uri: `github://repo/${repo.full_name}`,
      name: repo.name,
      description: repo.description || '',
      mimeType: 'application/json'
    }));
  }

  async readResource(uri: string): Promise<string> {
    // github://repo/owner/name
    const match = uri.match(/github:\/\/repo\/(.+)/);
    if (!match) throw new Error('Invalid GitHub URI');

    const [owner, repo] = match[1].split('/');
    const { data } = await this.octokit.repos.get({ owner, repo });

    return JSON.stringify(data, null, 2);
  }

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'create_issue',
        description: 'Creates a new GitHub issue',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string', description: 'Repository (owner/name)' },
            title: { type: 'string' },
            body: { type: 'string' }
          },
          required: ['repo', 'title']
        }
      },
      {
        name: 'list_issues',
        description: 'Lists issues in a repository',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string' },
            state: { type: 'string', enum: ['open', 'closed', 'all'] }
          },
          required: ['repo']
        }
      },
      {
        name: 'create_pr',
        description: 'Creates a pull request',
        inputSchema: {
          type: 'object',
          properties: {
            repo: { type: 'string' },
            title: { type: 'string' },
            head: { type: 'string', description: 'Branch to merge from' },
            base: { type: 'string', description: 'Branch to merge to' },
            body: { type: 'string' }
          },
          required: ['repo', 'title', 'head', 'base']
        }
      }
    ];
  }

  async callTool(name: string, params: any): Promise<any> {
    const [owner, repo] = params.repo.split('/');

    switch (name) {
      case 'create_issue':
        const { data: issue } = await this.octokit.issues.create({
          owner,
          repo,
          title: params.title,
          body: params.body
        });
        return issue;

      case 'list_issues':
        const { data: issues } = await this.octokit.issues.listForRepo({
          owner,
          repo,
          state: params.state || 'open'
        });
        return issues;

      case 'create_pr':
        const { data: pr } = await this.octokit.pulls.create({
          owner,
          repo,
          title: params.title,
          head: params.head,
          base: params.base,
          body: params.body
        });
        return pr;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
```

#### MCP Client (`src/mcp/mcp-client.ts`)

```typescript
import { MCPServer } from './mcp-types';
import { Tool, ToolResult } from '../types/agent.types';

export class MCPClient {
  private servers: Map<string, MCPServer> = new Map();

  /**
   * Enregistre un serveur MCP
   */
  registerServer(server: MCPServer): void {
    this.servers.set(server.name, server);
    console.log(`[MCP] Registered server: ${server.name}`);
  }

  /**
   * Convertit les outils MCP en Tools natifs
   */
  async getToolsFromServers(): Promise<Tool[]> {
    const tools: Tool[] = [];

    for (const [serverName, server] of this.servers) {
      if (!server.capabilities.tools) continue;

      const mcpTools = await server.listTools();

      for (const mcpTool of mcpTools) {
        // Convertir MCPTool en Tool
        tools.push({
          name: `${serverName}.${mcpTool.name}`,
          description: `[${serverName}] ${mcpTool.description}`,
          parameters: this.schemaToParameters(mcpTool.inputSchema),
          requiresPermission: true,
          permissionLevel: 'write',

          async execute(params): Promise<ToolResult> {
            try {
              const result = await server.callTool(mcpTool.name, params);
              return { success: true, data: result };
            } catch (error: any) {
              return { success: false, error: error.message };
            }
          }
        });
      }
    }

    return tools;
  }

  /**
   * Convertit un JSON Schema en paramètres
   */
  private schemaToParameters(schema: any): any[] {
    const props = schema.properties || {};
    const required = schema.required || [];

    return Object.entries(props).map(([name, prop]: [string, any]) => ({
      name,
      type: prop.type,
      description: prop.description || '',
      required: required.includes(name)
    }));
  }

  /**
   * Liste toutes les ressources disponibles
   */
  async listAllResources(): Promise<Array<{ server: string; resources: any[] }>> {
    const result = [];

    for (const [serverName, server] of this.servers) {
      if (!server.capabilities.resources) continue;

      const resources = await server.listResources();
      result.push({ server: serverName, resources });
    }

    return result;
  }
}

// Instance globale
export const globalMCPClient = new MCPClient();
```

#### Utilisation

```typescript
import { globalMCPClient } from './mcp/mcp-client';
import { GitHubMCPServer } from './mcp/servers/github-mcp';
import { globalToolRegistry } from './core/tool-registry';

// 1. Créer et enregistrer un serveur MCP
const githubServer = new GitHubMCPServer(process.env.GITHUB_TOKEN!);
globalMCPClient.registerServer(githubServer);

// 2. Obtenir les outils depuis les serveurs MCP
const mcpTools = await globalMCPClient.getToolsFromServers();

// 3. Les enregistrer dans le registry
globalToolRegistry.registerMultiple(mcpTools);

// 4. Créer un agent avec ces outils
const agent = new Agent({
  name: 'GitHubAgent',
  description: 'Agent qui gère GitHub',
  systemPrompt: 'Tu peux créer des issues et PRs sur GitHub.',
  tools: ['github.create_issue', 'github.list_issues', 'github.create_pr'],
  mode: 'interactive'
}, globalToolRegistry);

// 5. Utiliser
await agent.execute('Crée une issue dans mon/repo avec le titre "Bug Fix"');
```

---

## Skills & Slash Commands

### Concept

Les **Skills** sont des séquences d'actions prédéfinies, invoquées via des **slash commands**.

Exemple:
- `/review-code` - Lance une review de code complète
- `/deploy` - Déploie l'application
- `/debug` - Analyse et debug un problème

### Architecture

```typescript
// src/skills/skill-types.ts

export interface Skill {
  name: string;
  command: string;        // e.g., "/review-code"
  description: string;
  parameters?: SkillParameter[];
  execute: (context: SkillContext) => Promise<SkillResult>;
}

export interface SkillParameter {
  name: string;
  description: string;
  required: boolean;
  type: 'string' | 'number' | 'boolean';
}

export interface SkillContext {
  agent: Agent;
  args: Record<string, any>;
  memory: MemoryManager;
}

export interface SkillResult {
  success: boolean;
  message: string;
  data?: any;
}
```

### Skill Registry

```typescript
// src/skills/skill-registry.ts

export class SkillRegistry {
  private skills: Map<string, Skill> = new Map();

  register(skill: Skill): void {
    this.skills.set(skill.command, skill);
  }

  async execute(command: string, args: Record<string, any>, context: SkillContext): Promise<SkillResult> {
    const skill = this.skills.get(command);
    if (!skill) {
      return {
        success: false,
        message: `Skill "${command}" not found`
      };
    }

    return await skill.execute({ ...context, args });
  }

  list(): Skill[] {
    return Array.from(this.skills.values());
  }
}

export const globalSkillRegistry = new SkillRegistry();
```

### Example Skill: Code Review

```typescript
// src/skills/code-review-skill.ts

import { Skill, SkillContext, SkillResult } from './skill-types';

export const codeReviewSkill: Skill = {
  name: 'Code Review',
  command: '/review-code',
  description: 'Performs a comprehensive code review',

  parameters: [
    {
      name: 'path',
      description: 'Path to review (file or directory)',
      required: true,
      type: 'string'
    },
    {
      name: 'depth',
      description: 'Review depth: quick, normal, thorough',
      required: false,
      type: 'string'
    }
  ],

  async execute(context: SkillContext): Promise<SkillResult> {
    const { agent, args } = context;
    const path = args.path;
    const depth = args.depth || 'normal';

    console.log(`[Skill] Running code review on ${path} (${depth})`);

    // Étapes de la review
    const steps = [
      '1. Listing files...',
      '2. Reading code...',
      '3. Analyzing patterns...',
      '4. Checking for issues...',
      '5. Generating report...'
    ];

    for (const step of steps) {
      console.log(`[Skill] ${step}`);
    }

    // Exécuter les outils via l'agent
    const listResult = await agent.execute(`List all files in ${path}`);

    // Analyser chaque fichier
    // (Ici on utiliserait un LLM pour une vraie analyse)

    const report = `
Code Review Report for ${path}
==============================

Files reviewed: 12
Issues found: 3
Warnings: 7

Critical Issues:
- Potential SQL injection in auth.ts:45
- Unhandled promise rejection in api.ts:123

Suggestions:
- Consider adding error boundaries
- Add unit tests for utils/
- Update deprecated dependencies

Overall Score: B+
`;

    return {
      success: true,
      message: 'Code review completed',
      data: { report }
    };
  }
};
```

### Utilisation

```typescript
import { globalSkillRegistry } from './skills/skill-registry';
import { codeReviewSkill } from './skills/code-review-skill';

// Enregistrer le skill
globalSkillRegistry.register(codeReviewSkill);

// Parser une commande slash
function parseSlashCommand(input: string): { command: string; args: any } {
  const match = input.match(/^(\/.+?)(\s+(.+))?$/);
  if (!match) return null;

  const command = match[1];
  const argsString = match[3] || '';

  // Parse args simple: path=./src depth=thorough
  const args: Record<string, any> = {};
  argsString.split(/\s+/).forEach(arg => {
    const [key, value] = arg.split('=');
    if (key && value) args[key] = value;
  });

  return { command, args };
}

// Modifier Agent.execute pour supporter les slash commands
async execute(input: string): Promise<AgentResponse> {
  // Vérifier si c'est une slash command
  const slashCommand = parseSlashCommand(input);

  if (slashCommand) {
    const result = await globalSkillRegistry.execute(
      slashCommand.command,
      slashCommand.args,
      { agent: this, memory: this.memory, args: slashCommand.args }
    );

    return {
      message: result.message,
      nextAction: 'complete',
      metadata: result.data
    };
  }

  // Sinon, comportement normal
  return this.normalExecution(input);
}

// Utilisation
await agent.execute('/review-code path=./src depth=thorough');
```

---

## Hooks & Events

### Concept

Les **Hooks** permettent d'injecter du code à des moments clés du cycle de vie.

**Types de hooks:**
- `beforeThink` - Avant que l'agent raisonne
- `afterThink` - Après le raisonnement
- `beforeToolExecution` - Avant d'exécuter un outil
- `afterToolExecution` - Après l'exécution
- `onError` - Quand une erreur se produit

### Implémentation

```typescript
// src/core/hooks.ts

export type HookFunction = (context: HookContext) => Promise<void> | void;

export interface HookContext {
  agent: Agent;
  phase: string;
  data: any;
}

export class HookManager {
  private hooks: Map<string, HookFunction[]> = new Map();

  /**
   * Enregistre un hook
   */
  register(phase: string, hook: HookFunction): void {
    if (!this.hooks.has(phase)) {
      this.hooks.set(phase, []);
    }
    this.hooks.get(phase)!.push(hook);
  }

  /**
   * Exécute tous les hooks pour une phase
   */
  async execute(phase: string, context: HookContext): Promise<void> {
    const hooks = this.hooks.get(phase) || [];

    for (const hook of hooks) {
      try {
        await hook(context);
      } catch (error) {
        console.error(`[Hook] Error in ${phase}:`, error);
      }
    }
  }
}
```

### Intégration dans Agent

```typescript
export class Agent {
  private hookManager: HookManager;

  constructor(config: AgentConfig, toolRegistry: ToolRegistry) {
    this.hookManager = new HookManager();
    // ...
  }

  /**
   * Permet d'enregistrer des hooks
   */
  onHook(phase: string, hook: HookFunction): void {
    this.hookManager.register(phase, hook);
  }

  private async think(input: string): Promise<AgentResponse> {
    // Hook: before think
    await this.hookManager.execute('beforeThink', {
      agent: this,
      phase: 'beforeThink',
      data: { input }
    });

    const response = await this.thinkWithLLM(input);

    // Hook: after think
    await this.hookManager.execute('afterThink', {
      agent: this,
      phase: 'afterThink',
      data: { input, response }
    });

    return response;
  }

  private async executeTools(toolCalls: ToolCall[]): Promise<void> {
    for (const call of toolCalls) {
      // Hook: before tool
      await this.hookManager.execute('beforeToolExecution', {
        agent: this,
        phase: 'beforeToolExecution',
        data: { toolCall: call }
      });

      const result = await this.toolRegistry.executeTool(call.toolName, call.parameters);

      // Hook: after tool
      await this.hookManager.execute('afterToolExecution', {
        agent: this,
        phase: 'afterToolExecution',
        data: { toolCall: call, result }
      });
    }
  }
}
```

### Exemple d'utilisation

```typescript
// Logging hook
agent.onHook('beforeThink', async (context) => {
  console.log(`🧠 Agent is thinking about: ${context.data.input}`);
});

// Analytics hook
agent.onHook('afterToolExecution', async (context) => {
  const { toolCall, result } = context.data;

  analytics.track('tool_executed', {
    tool: toolCall.toolName,
    success: result.success,
    timestamp: new Date()
  });
});

// Security hook
agent.onHook('beforeToolExecution', async (context) => {
  const { toolCall } = context.data;

  // Bloquer certains outils dangereux
  if (toolCall.toolName === 'delete_database') {
    throw new Error('Delete database is not allowed!');
  }
});

// Cost tracking hook
let totalCost = 0;
agent.onHook('afterThink', async (context) => {
  const tokens = context.data.response.metadata?.usage;
  if (tokens) {
    const cost = calculateCost(tokens);
    totalCost += cost;
    console.log(`💰 Cost this call: $${cost.toFixed(4)} | Total: $${totalCost.toFixed(2)}`);
  }
});
```

---

## Conclusion

Ces concepts avancés transforment votre framework en un système professionnel:

✅ **MCP** - Connexions dynamiques aux APIs
✅ **Skills** - Workflows réutilisables
✅ **Hooks** - Extensibilité totale
✅ **Plugins** - Écosystème modulaire

**Next Steps:**
1. Implémentez MCP pour vos sources de données
2. Créez des skills pour vos workflows communs
3. Utilisez des hooks pour logging/analytics
4. Construisez un écosystème de plugins!

🎉 Vous avez maintenant un framework d'agents de niveau production!
