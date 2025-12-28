# 📚 Guide d'Apprentissage - Multi-Agent Systems

Ce guide récapitule tout ce que vous avez appris en construisant ce projet.

## 🎯 Concepts Maîtrisés

### 1. Architecture d'Agents IA

#### Qu'est-ce qu'un Agent?
Un **agent** est une entité autonome qui:
- Perçoit son environnement (via le **contexte**)
- Raisonne sur quoi faire (via un **LLM** ou logique)
- Agit avec des **outils**
- Apprend et se souvient (via la **mémoire**)

#### Architecture en couches
```
┌─────────────────────────────────┐
│   Interface (User/API)          │  ← Point d'entrée
├─────────────────────────────────┤
│   Agent Runtime                 │  ← Orchestration
│   - Lifecycle management        │
│   - Reasoning (LLM)             │
├─────────────────────────────────┤
│   Core Services                 │
│   - Tool Registry               │  ← Capacités
│   - Memory Manager              │  ← État
│   - Context Manager             │  ← Conscience
├─────────────────────────────────┤
│   Infrastructure                │
│   - MCP Servers                 │  ← Connexions externes
│   - Skills                      │  ← Workflows
│   - Hooks                       │  ← Extensibilité
└─────────────────────────────────┘
```

---

### 2. Tool System (Système d'Outils)

#### Pourquoi des outils?
Les LLMs seuls peuvent seulement **parler**. Les outils leur donnent des **mains** pour agir.

#### Anatomie d'un outil
```typescript
const myTool: Tool = {
  // Identité
  name: 'send_email',
  description: 'Envoie un email',

  // Contrat (paramètres avec validation)
  parameters: [
    {
      name: 'to',
      type: 'string',
      required: true,
      schema: z.string().email()  // Validation Zod!
    }
  ],

  // Sécurité
  requiresPermission: true,
  permissionLevel: 'write',

  // Action
  async execute(params) {
    // Votre logique ici
    await sendEmail(params.to, params.subject, params.body);
    return { success: true };
  }
};
```

#### Design Patterns pour Outils

**1. Composition**
Combiner des outils simples en outils complexes:
```typescript
const deployTool = compositeOf([
  runTestsTool,
  buildTool,
  uploadTool,
  notifyTool
]);
```

**2. Error Handling**
Toujours retourner `ToolResult` avec success/error:
```typescript
try {
  const result = await doSomething();
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}
```

**3. Idempotence**
Les outils doivent être sûrs à réexécuter:
```typescript
// BAD: Crée un fichier (échoue si existe)
await fs.writeFile(path, content);

// GOOD: Remplace ou crée
await fs.writeFile(path, content, { flag: 'w' });
```

---

### 3. Memory Management (Gestion de Mémoire)

#### Types de mémoire

**Working Memory (RAM)**
```typescript
memory.set('user_name', 'Alice');
memory.set('preferences', { theme: 'dark' });

// Plus tard...
const name = memory.get('user_name');  // 'Alice'
```

**Conversation Memory (Historique)**
```typescript
memory.addMessage({
  role: 'user',
  content: 'Hello!',
  timestamp: new Date()
});

// Récupérer les 10 derniers
const recent = memory.getRecentMessages(10);
```

**Long-term Memory (Disque)**
```typescript
// Sauvegarder
await memory.persist();

// Charger (nouvelle session)
await memory.load();
```

#### Stratégies de Mémoire Avancées

**1. Sliding Window**
Garder seulement N messages récents pour économiser tokens:
```typescript
const WINDOW_SIZE = 20;
const context = memory.getRecentMessages(WINDOW_SIZE);
```

**2. Summarization**
Résumer l'ancien historique:
```typescript
if (memory.getMessages().length > 100) {
  const summary = await llm.summarize(oldMessages);
  memory.set('conversation_summary', summary);
  memory.clearOldMessages(50);  // Garder seulement 50 récents
}
```

**3. Semantic Search (avec vectors)**
```typescript
// Chercher les messages les plus pertinents
const relevant = await memory.searchSemantic(
  "How do I deploy?",
  topK: 5
);
```

---

### 4. Context (Contexte)

Le **contexte** est "tout ce que l'agent sait en ce moment".

#### Composants du contexte
```typescript
interface AgentContext {
  // Qui parle? (historique)
  messages: Message[];

  // Quoi faire? (outils disponibles)
  availableTools: string[];

  // Où sommes-nous? (environnement)
  environment: {
    workingDirectory: string;
    user: string;
    timestamp: Date;
  };

  // Qu'avons-nous fait? (mémoire)
  workingMemory: Record<string, any>;

  // Metadata
  sessionId: string;
  parentAgentId?: string;  // Si subagent
}
```

#### Context Window Optimization

Le contexte a une **taille limitée** (tokens):
```typescript
// Stratégie 1: Prioriser
const context = [
  systemPrompt,              // Toujours
  conversationSummary,       // Si existe
  ...recentMessages(10),     // Les 10 derniers
  currentTask,               // Toujours
];

// Stratégie 2: Compresser
const compressed = compressContext(fullContext, maxTokens: 4000);

// Stratégie 3: Chunking
const chunks = splitContext(largeContext, chunkSize: 2000);
for (const chunk of chunks) {
  await processChunk(chunk);
}
```

---

### 5. Prompts (Art du Prompting)

#### Anatomy d'un bon System Prompt

```typescript
const systemPrompt = `
# IDENTITÉ
Tu es ${agentName}, un ${agentRole}.

# OBJECTIF
Ta mission est de ${agentGoal}.

# CAPACITÉS
Tu as accès aux outils suivants:
${toolDescriptions}

# CONTRAINTES
- Ne jamais ${constraint1}
- Toujours ${constraint2}
- Maximum ${maxIterations} itérations

# STYLE
- Sois ${personality}
- Réponds en ${language}
- Format: ${format}

# EXEMPLES
User: "${exampleInput}"
Assistant: ${exampleOutput}
`;
```

#### Techniques de Prompting

**1. Few-Shot Learning**
Donne des exemples:
```typescript
const prompt = `
Voici comment analyser du code:

Example 1:
Input: "function add(a, b) { return a + b }"
Output: "Simple addition function, no issues"

Example 2:
Input: "eval(userInput)"
Output: "CRITICAL: eval() is dangerous, use JSON.parse"

Now analyze:
Input: "${codeToAnalyze}"
Output:
`;
```

**2. Chain-of-Thought**
Demande au LLM d'expliquer son raisonnement:
```typescript
const prompt = `
Analyse cette requête: "${userQuery}"

Pense étape par étape:
1. Quel est l'objectif?
2. Quels outils utiliser?
3. Dans quel ordre?
4. Quels paramètres?

Ensuite, exécute.
`;
```

**3. Self-Consistency**
Demande plusieurs solutions et choisis la meilleure:
```typescript
const solutions = await Promise.all([
  llm.solve(problem, temperature: 0.7),
  llm.solve(problem, temperature: 0.8),
  llm.solve(problem, temperature: 0.9),
]);

const best = chooseBest(solutions);
```

---

### 6. Subagents (Délégation)

#### Pourquoi des subagents?

**Spécialisation**: Chaque agent est expert dans son domaine
```typescript
const mainAgent = new Agent({
  name: 'Orchestrator',
  canSpawnSubagents: true
});

// Déléguer à un expert
const securityReport = await mainAgent.spawnSubagent({
  name: 'SecurityExpert',
  tools: ['scan_vulnerabilities', 'check_dependencies'],
  systemPrompt: 'Tu es un expert en sécurité.'
}, 'Analyse la sécurité de ce code');
```

#### Patterns de Coordination

**1. Pipeline**
```typescript
// Agent 1: Collecte
const data = await dataCollector.execute('Gather user data');

// Agent 2: Transformation
const transformed = await transformer.execute(`Transform: ${data}`);

// Agent 3: Chargement
await loader.execute(`Load: ${transformed}`);
```

**2. Map-Reduce**
```typescript
// Map: Plusieurs subagents en parallèle
const files = ['a.ts', 'b.ts', 'c.ts'];
const analyses = await Promise.all(
  files.map(file =>
    mainAgent.spawnSubagent(analyzerConfig, `Analyze ${file}`)
  )
);

// Reduce: Combiner les résultats
const finalReport = combineAnalyses(analyses);
```

**3. Hierarchical**
```typescript
// CEO Agent
const ceo = new Agent({ name: 'CEO' });

// Manager Agents
const devManager = await ceo.spawnSubagent(devManagerConfig);
const qaManager = await ceo.spawnSubagent(qaManagerConfig);

// Worker Agents
const developer = await devManager.spawnSubagent(developerConfig);
const tester = await qaManager.spawnSubagent(testerConfig);
```

---

### 7. MCP (Model Context Protocol)

#### Concept

MCP permet de **brancher des sources de données** dynamiquement.

**Sans MCP**:
```typescript
// Codé en dur
const githubTool = createGitHubTool();
const notionTool = createNotionTool();
```

**Avec MCP**:
```typescript
// Découverte automatique
const mcpServers = discoverMCPServers();
const tools = await mcpClient.getToolsFromServers(mcpServers);
// Boom! Tous les outils GitHub, Notion, etc. disponibles
```

#### Créer un MCP Server

```typescript
class CustomMCPServer implements MCPServer {
  name = 'my-service';
  capabilities = { tools: true, resources: true };

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: 'do_something',
        description: 'Does something cool',
        inputSchema: { /* JSON Schema */ }
      }
    ];
  }

  async callTool(name: string, params: any): Promise<any> {
    switch (name) {
      case 'do_something':
        return await this.doSomething(params);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async listResources(): Promise<MCPResource[]> {
    return [
      {
        uri: 'custom://resource/123',
        name: 'My Resource',
        description: 'A cool resource'
      }
    ];
  }

  async readResource(uri: string): Promise<string> {
    // Fetch and return resource content
  }
}
```

---

### 8. Skills (Workflows Réutilisables)

#### Concept

Les **skills** sont des séquences d'actions complexes, empaquetées comme une commande.

```typescript
const codeReviewSkill: Skill = {
  name: 'Code Review',
  command: '/review-code',

  async execute({ agent, args }) {
    // 1. List files
    const files = await agent.execute(`List ${args.path}`);

    // 2. Analyze each
    const issues = [];
    for (const file of files) {
      const analysis = await agent.execute(`Analyze ${file}`);
      issues.push(...analysis.issues);
    }

    // 3. Generate report
    const report = generateReport(issues);

    // 4. Save
    await agent.execute(`Write report.md: ${report}`);

    return { success: true, data: { report } };
  }
};
```

#### Skill Composition

```typescript
// Skill simple
const testSkill = createSkill('/test', runTests);
const buildSkill = createSkill('/build', runBuild);

// Skill composé
const ciSkill = composeSkills('/ci', [
  testSkill,
  buildSkill,
  deploySkill
]);
```

---

### 9. Hooks (Extensibilité)

#### Concept

Les **hooks** permettent d'injecter du code à des moments clés.

```typescript
// Hook: Logger
agent.onHook('beforeToolExecution', async ({ data }) => {
  console.log(`🔧 Executing: ${data.toolCall.toolName}`);
});

// Hook: Analytics
agent.onHook('afterToolExecution', async ({ data }) => {
  analytics.track('tool_used', {
    tool: data.toolCall.toolName,
    success: data.result.success
  });
});

// Hook: Security
agent.onHook('beforeToolExecution', async ({ data }) => {
  if (isDangerous(data.toolCall)) {
    throw new Error('Blocked for security');
  }
});

// Hook: Cost Tracking
let totalCost = 0;
agent.onHook('afterThink', async ({ data }) => {
  const cost = calculateCost(data.response.metadata.usage);
  totalCost += cost;
  console.log(`💰 Total: $${totalCost.toFixed(2)}`);
});
```

---

### 10. Modes d'Agents

#### Autonomous Mode
L'agent décide tout seul:
```typescript
const agent = new Agent({
  mode: 'autonomous',
  maxIterations: 50
});

await agent.execute('Deploy the app to production');
// L'agent va:
// 1. Run tests
// 2. Build
// 3. Upload
// 4. Notify
// Sans demander de confirmation
```

#### Interactive Mode
L'agent demande confirmation:
```typescript
const agent = new Agent({
  mode: 'interactive'
});

await agent.execute('Delete all user data');
// L'agent va demander:
// "⚠️ This will delete all data. Confirm? (y/n)"
```

#### Planning Mode
L'agent crée un plan d'abord:
```typescript
const agent = new Agent({
  mode: 'planning'
});

await agent.execute('Refactor the codebase');
// L'agent retourne:
// Plan:
// 1. Analyze current structure
// 2. Identify patterns to extract
// 3. Create new modules
// 4. Migrate code
// 5. Update imports
// 6. Run tests
//
// Approve? (y/n)
```

---

## 🎓 Patterns & Best Practices

### Pattern 1: Error Recovery

```typescript
async function executeWithRetry(
  tool: string,
  params: any,
  maxRetries = 3
): Promise<ToolResult> {
  for (let i = 0; i < maxRetries; i++) {
    const result = await toolRegistry.executeTool(tool, params);

    if (result.success) {
      return result;
    }

    console.log(`Retry ${i + 1}/${maxRetries}`);
    await wait(1000 * Math.pow(2, i));  // Exponential backoff
  }

  throw new Error('Max retries exceeded');
}
```

### Pattern 2: Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailure?: Date;

  async execute(fn: () => Promise<any>) {
    // Si trop d'échecs récents, fail fast
    if (this.failures > 5 && this.isRecent(this.lastFailure)) {
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();
      this.failures = 0;  // Reset on success
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = new Date();
      throw error;
    }
  }
}
```

### Pattern 3: Agent Pool

```typescript
class AgentPool {
  private agents: Agent[] = [];
  private busy = new Set<string>();

  async acquire(): Promise<Agent> {
    // Chercher un agent libre
    const available = this.agents.find(a => !this.busy.has(a.state.id));

    if (available) {
      this.busy.add(available.state.id);
      return available;
    }

    // Créer un nouveau si besoin
    const agent = new Agent(config, toolRegistry);
    this.agents.push(agent);
    this.busy.add(agent.state.id);
    return agent;
  }

  release(agent: Agent): void {
    this.busy.delete(agent.state.id);
  }
}
```

---

## 🚀 Prochaines Étapes

### Cette Semaine
1. ✅ **Comprendre l'architecture** - FAIT!
2. 🔄 **Intégrer un LLM** - Voir [INTEGRATION_LLM.md](INTEGRATION_LLM.md)
3. 🔄 **Créer vos propres outils**

### Ce Mois
1. Implémenter MCP servers
2. Créer des skills custom
3. Tester en conditions réelles

### Ce Trimestre
1. Web UI
2. Plugin system
3. Production deployment

---

## 📖 Resources

### Lectures Essentielles
- [LangChain Docs](https://js.langchain.com/) - Framework similaire
- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT) - Agent autonome
- [Claude API Docs](https://docs.anthropic.com/) - Pour l'intégration
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)

### Concepts Avancés
- **Reinforcement Learning** pour agents
- **Multi-Agent RL** (coordination)
- **Prompt Engineering** techniques
- **RAG** (Retrieval-Augmented Generation)

### Projets Inspirants
- [AutoGPT](https://github.com/Significant-Gravitas/AutoGPT)
- [BabyAGI](https://github.com/yoheinakajima/babyagi)
- [GPT-Engineer](https://github.com/gpt-engineer-org/gpt-engineer)

---

## 🎉 Conclusion

Vous avez maintenant:
- ✅ Un framework d'agents complet
- ✅ Compréhension des concepts clés
- ✅ Les bases pour construire des systèmes complexes
- ✅ Une roadmap claire pour continuer

**Le plus important**: Vous comprenez **pourquoi** chaque partie existe, pas seulement **comment** elle fonctionne.

Continuez à expérimenter, à casser des choses, et à apprendre!

Happy coding! 🚀
