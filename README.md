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

### 2. Tools - Les Capacités de l'Agent

Les **outils** sont les "super-pouvoirs" de l'agent. Chaque outil:
- 📝 A un nom et une description
- 🔧 Définit ses paramètres (avec validation)
- ⚡ Exécute une action asynchrone
- 🔒 Peut requérir des permissions

**Créer un outil personnalisé:**

```typescript
import { Tool, ToolResult } from './types/agent.types';
import { z } from 'zod';

const weatherTool: Tool = {
  name: 'get_weather',
  description: 'Obtient la météo pour une ville',

  parameters: [
    {
      name: 'city',
      type: 'string',
      description: 'Nom de la ville',
      required: true,
      schema: z.string().min(1)
    }
  ],

  async execute(params): Promise<ToolResult> {
    // Votre logique ici
    const weather = await fetchWeather(params.city);

    return {
      success: true,
      data: { temperature: 20, condition: 'sunny' }
    };
  }
};

// Enregistrer l'outil
globalToolRegistry.register(weatherTool);
```

### 3. Context - La Conscience de l'Agent

Le **contexte** contient tout ce que l'agent "sait":

```typescript
interface AgentContext {
  messages: Message[];           // Historique de conversation
  environment: Record<string, any>; // Variables d'environnement
  availableTools: string[];      // Outils disponibles
  workingMemory: Record<string, any>; // Mémoire temporaire
  sessionId: string;             // ID de session
  parentAgentId?: string;        // Si c'est un subagent
}
```

### 4. Memory - Stockage d'État

Le **MemoryManager** gère deux types de mémoire:

#### Mémoire de Travail (Working Memory)
Temporaire, comme la RAM:

```typescript
const memory = agent.getMemory();

// Stocker une valeur
memory.set('user_preference', 'dark_mode');

// Récupérer une valeur
const pref = memory.get('user_preference');

// Lister toutes les clés
const keys = memory.keys();
```

#### Mémoire de Conversation
L'historique des messages:

```typescript
// Ajouter un message
memory.addMessage({
  role: MessageRole.USER,
  content: 'Hello!',
  timestamp: new Date()
});

// Récupérer les 5 derniers messages
const recent = memory.getRecentMessages(5);

// Rechercher dans l'historique
const results = memory.searchMessages('config');
```

#### Persistence
Sauvegarder/charger depuis le disque:

```typescript
// Sauvegarder
await memory.persist();

// Charger
await memory.load();
```

### 5. Agent Configuration - Le Blueprint

La **configuration** définit un agent:

```typescript
const config: AgentConfig = {
  name: 'CodeAnalyzer',
  description: 'Analyse du code source',

  // Prompt système - définit le comportement
  systemPrompt: `Tu es un expert en analyse de code.
  Tu peux lire des fichiers et identifier des bugs.`,

  // Outils disponibles
  tools: ['read_file', 'list_directory', 'search_code'],

  // Mode de fonctionnement
  mode: 'autonomous', // ou 'interactive' ou 'planning'

  // Capacités
  canSpawnSubagents: true,
  maxSubagents: 3,

  // Mémoire
  memoryConfig: {
    enabled: true,
    persistToDisk: true,
    memoryPath: './memory'
  },

  // Limites de sécurité
  maxIterations: 50
};
```

### 6. Tool Registry - Le Gestionnaire d'Outils

Le **ToolRegistry** centralise tous les outils:

```typescript
import { globalToolRegistry } from './core/tool-registry';

// Enregistrer un outil
globalToolRegistry.register(myTool);

// Enregistrer plusieurs outils
globalToolRegistry.registerMultiple([tool1, tool2, tool3]);

// Lister tous les outils
const tools = globalToolRegistry.listTools();

// Obtenir un outil
const calculator = globalToolRegistry.getTool('calculator');

// Exécuter un outil
const result = await globalToolRegistry.executeTool(
  'calculator',
  { expression: '2 + 2' }
);
```

### 7. Créer et Utiliser un Agent

```typescript
import { Agent } from './core/agent';
import { globalToolRegistry } from './core/tool-registry';

// 1. Setup des outils
globalToolRegistry.registerMultiple(fileTools);
globalToolRegistry.registerMultiple(utilityTools);

// 2. Créer la configuration
const config: AgentConfig = {
  name: 'Assistant',
  description: 'Un assistant utile',
  systemPrompt: 'Tu es un assistant qui aide avec les fichiers.',
  tools: ['read_file', 'write_file', 'calculator'],
  mode: 'interactive'
};

// 3. Créer l'agent
const agent = new Agent(config, globalToolRegistry);

// 4. Exécuter une tâche
const response = await agent.execute('Calcule 15 * 23 + 100');

console.log(response.message);
// Output: "Calculating the expression..."

// 5. Vérifier la mémoire
const memory = agent.getMemory();
console.log(memory.get('tool_result_calculator'));
// Output: { success: true, data: { result: 445 } }
```

### 8. Subagents - Délégation de Tâches

Les **subagents** permettent de déléguer des tâches spécialisées:

```typescript
// Configuration du subagent
const subConfig: AgentConfig = {
  name: 'SecurityAnalyzer',
  description: 'Analyse de sécurité du code',
  systemPrompt: 'Tu es un expert en sécurité.',
  tools: ['read_file', 'search_vulnerabilities'],
  mode: 'autonomous'
};

// L'agent principal spawne un subagent
const result = await mainAgent.spawnSubagent(
  subConfig,
  'Analyse ce fichier pour des vulnérabilités'
);

// Le subagent exécute la tâche de manière autonome
console.log(result.message);
```

## 🛠️ Outils Inclus

### File Tools
- **read_file** - Lit un fichier
- **write_file** - Écrit dans un fichier
- **list_directory** - Liste un répertoire

### Utility Tools
- **calculator** - Évalue des expressions mathématiques
- **get_timestamp** - Obtient l'heure actuelle
- **wait** - Attend un délai spécifié

## 📖 Exemples Avancés

### Exemple 1: Agent avec Mémoire Persistante

```typescript
const config: AgentConfig = {
  name: 'PersistentAgent',
  description: 'Agent qui se souvient entre sessions',
  systemPrompt: 'Tu es un assistant avec mémoire.',
  tools: ['calculator', 'read_file'],
  memoryConfig: {
    enabled: true,
    persistToDisk: true,
    memoryPath: './agent-memory'
  }
};

const agent = new Agent(config, globalToolRegistry, 'session-123');

// Première session
await agent.execute('Mon nom est Alice');
await agent.persist(); // Sauvegarde

// Plus tard, nouvelle instance avec même sessionId
const agent2 = new Agent(config, globalToolRegistry, 'session-123');
await agent2.getMemory().load(); // Charge la mémoire
// L'agent se souvient qu'on s'appelle Alice!
```

### Exemple 2: Pipeline Multi-Agents

```typescript
// Agent 1: Collecteur de données
const collector = new Agent(dataCollectorConfig, globalToolRegistry);
await collector.execute('Liste tous les fichiers .ts');

// Agent 2: Analyseur (utilise les résultats de Agent 1)
const analyzer = new Agent(analyzerConfig, globalToolRegistry);
const files = collector.getMemory().get('file_list');
await analyzer.execute(`Analyse ces fichiers: ${files}`);

// Agent 3: Générateur de rapport
const reporter = new Agent(reporterConfig, globalToolRegistry);
const analysis = analyzer.getMemory().get('analysis_result');
await reporter.execute(`Crée un rapport: ${analysis}`);
```

### Exemple 3: Tool Personnalisé avec Validation Zod

```typescript
import { z } from 'zod';

const createUserTool: Tool = {
  name: 'create_user',
  description: 'Crée un nouvel utilisateur',

  parameters: [
    {
      name: 'user',
      type: 'object',
      description: 'Données utilisateur',
      required: true,
      schema: z.object({
        name: z.string().min(2).max(50),
        email: z.string().email(),
        age: z.number().min(18).max(120)
      })
    }
  ],

  requiresPermission: true,
  permissionLevel: 'write',

  async execute(params): Promise<ToolResult> {
    const user = params.user;
    // Zod a déjà validé les données!

    await database.createUser(user);

    return {
      success: true,
      data: { userId: '123', created: true }
    };
  }
};
```

## 🔐 Sécurité et Permissions

Les outils peuvent définir des **niveaux de permission**:

```typescript
const dangerousTool: Tool = {
  name: 'delete_database',
  description: 'Supprime la base de données',
  requiresPermission: true,
  permissionLevel: 'admin', // Nécessite admin

  async execute(params): Promise<ToolResult> {
    // Logique de suppression
  }
};
```

**Limites de sécurité dans AgentConfig:**

```typescript
const config: AgentConfig = {
  maxIterations: 100,  // Évite les boucles infinies
  maxSubagents: 5,     // Limite le nombre de subagents
  // ...
};
```

## 🎯 Cas d'Usage

### 1. Assistant de Code
```typescript
const codeAssistant = {
  name: 'CodeHelper',
  tools: ['read_file', 'write_file', 'search_code', 'run_tests'],
  systemPrompt: 'Tu aides les développeurs avec leur code.'
};
```

### 2. Data Pipeline
```typescript
const dataPipeline = {
  name: 'DataProcessor',
  tools: ['read_csv', 'transform_data', 'write_database'],
  canSpawnSubagents: true, // Pour traitement parallèle
  systemPrompt: 'Tu transformes et charges des données.'
};
```

### 3. DevOps Automation
```typescript
const devopsAgent = {
  name: 'DevOpsBot',
  tools: ['ssh_execute', 'docker_command', 'kubernetes_apply'],
  permissionLevel: 'admin',
  systemPrompt: 'Tu gères le déploiement et l\'infrastructure.'
};
```

## 🔄 Workflows et Modes

### Mode Autonomous
L'agent décide lui-même des actions à prendre:
```typescript
mode: 'autonomous'
```

### Mode Interactive
L'agent demande confirmation avant d'agir:
```typescript
mode: 'interactive'
```

### Mode Planning
L'agent crée un plan avant d'exécuter:
```typescript
mode: 'planning'
```

## 📊 Monitoring et Debugging

### Accès à l'État de l'Agent

```typescript
const state = agent.getState();

console.log('Status:', state.status);
console.log('Iterations:', state.iterations);
console.log('Tools disponibles:', state.context.availableTools);
console.log('Nombre de subagents:', state.subagents.size);
```

### Export de la Mémoire

```typescript
const memory = agent.getMemory();
const memoryDump = memory.export();

console.log(memoryDump); // JSON formaté
```

### Statistiques

```typescript
const stats = memory.getStats();
// {
//   workingMemorySize: 5,
//   conversationLength: 12,
//   sessionId: 'abc-123'
// }
```

## 🚧 Prochaines Étapes / Roadmap

### Phase 1 ✅ (Actuelle)
- [x] Architecture de base des agents
- [x] Tool registry et système d'outils
- [x] Memory management
- [x] Subagents support
- [x] Exemples de démonstration

### Phase 2 (À venir)
- [ ] **LLM Integration** - Brancher OpenAI/Claude/etc
- [ ] **Plugin System** - Charger des plugins dynamiquement
- [ ] **MCP Integration** - Model Context Protocol
- [ ] **Skills** - Commandes slash personnalisées
- [ ] **Hooks** - Événements avant/après actions
- [ ] **Web UI** - Interface graphique de monitoring

### Phase 3 (Avancé)
- [ ] **Workflow Builder** - GUI pour créer des workflows
- [ ] **LSP Integration** - Auto-complétion pour configs
- [ ] **Multi-Agent Orchestration** - Coordination complexe
- [ ] **Distributed Agents** - Agents sur plusieurs machines
- [ ] **Agent Marketplace** - Partager/télécharger des agents

## 💡 Concepts à Explorer

### 1. Prompts et Context Windows
- Comment optimiser les prompts système
- Gestion de la taille du contexte pour LLMs
- Stratégies de résumé automatique

### 2. Memory Strategies
- Mémoire vectorielle (embeddings)
- Retrieval-Augmented Generation (RAG)
- Compression de l'historique

### 3. Multi-Agent Coordination
- Patterns de communication inter-agents
- Résolution de conflits
- Load balancing entre agents

### 4. Tool Design Patterns
- Tools composables
- Tool chaining
- Error handling et retry logic

## 📚 Resources Utiles

- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Zod Documentation**: https://zod.dev/
- **Claude API**: https://docs.anthropic.com/
- **OpenAI API**: https://platform.openai.com/docs/
- **LangChain** (inspiration): https://js.langchain.com/

## 🤝 Contribution

Ce projet est un framework d'apprentissage. Suggestions d'améliorations:

1. **Nouveaux Outils**: Créez des outils pour APIs, databases, etc.
2. **Agents Spécialisés**: Partagez vos configurations d'agents
3. **Exemples**: Ajoutez des cas d'usage réels
4. **Documentation**: Améliorez les explications

## 📝 License

MIT License - Libre d'utilisation et modification

---

## 🎓 Conclusion

Vous avez maintenant un framework complet pour:
- ✅ Créer des agents autonomes
- ✅ Définir des outils personnalisés
- ✅ Gérer la mémoire et le contexte
- ✅ Orchestrer des subagents
- ✅ Builder des systèmes multi-agents complexes

**Prochaine étape**: Branchez un vrai LLM (OpenAI, Claude, etc.) pour des agents vraiment intelligents!

Pour des questions ou suggestions, ouvrez une issue sur GitHub.

Happy Agent Building! 🚀
