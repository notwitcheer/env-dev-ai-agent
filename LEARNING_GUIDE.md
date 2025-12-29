# 📚 Learning Guide - Multi-Agent Systems

This guide summarizes everything you have learned while building this project.

## 🎯 Concepts Mastered

### 1. AI Agent Architecture

#### What is an Agent?
An **agent** is an autonomous entity that:
- Perceives its environment (via **context**)
- Reasons about what to do (via **LLM** or logic)
- Acts with **tools**
- Learns and remembers (via **memory**)

#### Layered Architecture
```
┌─────────────────────────────────┐
│   Interface (User/API)          │  ← Entry point
├─────────────────────────────────┤
│   Agent Runtime                 │  ← Orchestration
│   - Lifecycle management        │
│   - Reasoning (LLM)             │
├─────────────────────────────────┤
│   Core Services                 │
│   - Tool Registry               │  ← Capabilities
│   - Memory Manager              │  ← State
│   - Context Manager             │  ← Awareness
├─────────────────────────────────┤
│   Infrastructure                │
│   - MCP Servers                 │  ← External Connections
│   - Skills                      │  ← Workflows
│   - Hooks                       │  ← Extensibility
└─────────────────────────────────┘
```

---

### 2. Tool System

#### Why tools?
LLMs alone can only **talk**. Tools give them **hands** to act.

#### Anatomy of a tool
```typescript
const myTool: Tool = {
  // Identity
  name: ‘send_email’,
  description: ‘Sends an email’,

  // Contract (parameters with validation)
  parameters: [
    {
      name: ‘to’,
      type: ‘string’,
      required: true,
      schema: z.string().email()  // Zod validation!
    }
  ],

  // Security
  requiresPermission: true,
  permissionLevel: ‘write’,

  // Action
  async execute(params) {
    // Your logic here
    await sendEmail(params.to, params.subject, params.body);
    return { success: true };
  }
};
```

#### Design Patterns for Tools

**1. Composition**
Combine simple tools into complex tools:
```typescript
const deployTool = compositeOf([
  runTestsTool,
  buildTool,
  uploadTool,
  notifyTool
]);
```

**2. Error Handling**
Always return `ToolResult` with success/error:
```typescript
try {
  const result = await doSomething();
  return { success: true, data: result };
} catch (error) {
  return { success: false, error: error.message };
}
```

**3. Idempotence**
Tools must be safe to re-execute:
```typescript
// BAD: Creates a file (fails if it exists)
await fs.writeFile(path, content);

// GOOD: Replaces or creates
await fs.writeFile(path, content, { flag: ‘w’ });
```

---

### 3. Memory Management

#### Types of Memory

**Random Access Memory (RAM)**
```typescript
memory.set(“user_name”, “Alice”);
memory.set(“preferences”, { theme: “dark” });

// Later...
const name = memory.get(“user_name”);  // “Alice”
```

**Conversation Memory (History)**
```typescript
memory.addMessage({
  role: “user”,
  content: “Hello!”,
  timestamp: new Date()
});

// Retrieve the last 10
const recent = memory.getRecentMessages(10);
```

**Long-term memory (Disk)**
```typescript
// Save
await memory.persist();

// Load (new session)
await memory.load();
```

#### Advanced memory strategies

**1. Sliding window**
Keep only N recent messages to save tokens:
```typescript
const WINDOW_SIZE = 20;
const context = memory.getRecentMessages(WINDOW_SIZE);
```

**2. Summary**
Summarize the old history:
```typescript
if (memory.getMessages().length > 100) {
  const summary = await llm.summarize(oldMessages);
  memory.set(“conversation_summary”, summary);
  memory.clearOldMessages(50);  // Keep only the 50 most recent messages
}
```

**3. Semantic search (with vectors)**
```typescript
// Search for the most relevant messages
const relevant = await memory.searchSemantic(
  “How do I deploy?”,
  topK: 5
);
```

---

### 4. Context

The **context** is “everything the agent knows at this moment.”

#### Context components
```typescript
interface AgentContext {
  // Who is speaking? (history)
  messages: Message[];

  // What to do? (available tools)
  availableTools: string[];

  // Where are we? (environment)
  environment: {
    workingDirectory: string;
    user: string;
    timestamp: Date;
  };

  // What have we done? (memory)
  workingMemory: Record<string, any>;

  // Metadata
  sessionId: string;
  parentAgentId?: string;  // If subagent
}
```

#### Context Window Optimization

The context has a **limited size** (tokens):
```typescript
// Strategy 1: Prioritize
const context = [
  systemPrompt,              // Always
  conversationSummary,       // If exists
  ...recentMessages(10),     // The last 10
  currentTask,               // Always
];

// Strategy 2: Compress
const compressed = compressContext(fullContext, maxTokens: 4000);

// Strategy 3: Chunking
const chunks = splitContext(largeContext, chunkSize: 2000);
for (const chunk of chunks) {
  await processChunk(chunk);
}
```

---

### 5. Prompts (The Art of Prompting)

#### Anatomy of a Good System Prompt

```typescript
const systemPrompt = `
# IDENTITY
You are ${agentName}, a ${agentRole}.

# OBJECTIVE
Your mission is to ${agentGoal}.

# CAPABILITIES
You have access to the following tools:
${toolDescriptions}

# CONSTRAINTS
- Never ${constraint1}
- Always ${constraint2}
- Maximum ${maxIterations} iterations

# STYLE
- Be ${personality}
- Respond in ${language}
- Format: ${format}

# EXAMPLES
User: “${exampleInput}”
Assistant: ${exampleOutput}
`;
```

Prompting Techniques

**1. Few-Shot Learning**
Give examples:
```typescript
const prompt = `
Here's how to analyze code:

Example 1:
Input: “function add(a, b) { return a + b }”
Output: “Simple addition function, no problem”

Example 2:
Input: “eval(userInput)”
Output: “CRITICAL: eval() is dangerous, use JSON.parse”

Now analyze:
Input: “${codeToAnalyze}”
Output:
`;
```

**2. Thought Process**
Ask the LLM to explain its reasoning:
```typescript
const prompt = `
Analyze this query: “${userQuery}”

Think step by step:
1. What is the goal?
2. What tools to use?
3. In what order?
4. What parameters?

Then execute.
`;
```

**3. Internal consistency**
Request multiple solutions and choose the best one:
```typescript
const solutions = await Promise.all([
  llm.solve(problem, temperature: 0.7),
  llm.solve(problem, temperature: 0.8),
  llm.solve(problem, temperature: 0.9),
]);

const best = chooseBest(solutions);
```

---

### 6. Subagents (Delegation)

#### Why subagents?

**Specialization**: Each agent is an expert in its field
```typescript
const mainAgent = new Agent({
  name: ‘Orchestrator’,
  canSpawnSubagents: true
});

// Delegate to an expert
const securityReport = await mainAgent.spawnSubagent({
  name: ‘SecurityExpert’,
  tools: [‘scan_vulnerabilities’, ‘check_dependencies’],
  systemPrompt: ‘You are a security expert.’
}, ‘Analyze the security of this code’);
```

#### Coordination Patterns

**1. Pipeline**
```typescript
// Agent 1: Collection
const data = await dataCollector.execute(‘Gather user data’);

// Agent 2: Transformation
const transformed = await transformer.execute(`Transform: ${data}`);

// Agent 3: Load
await loader.execute(`Load: ${transformed}`);
```

**2. Map-Reduce**
```typescript
// Map: Multiple subagents in parallel
const files = [‘a.ts’, ‘b.ts’, ‘c.ts’];
const analyses = await Promise.all(
  files.map (file =>
    mainAgent.spawnSubagent(analyzerConfig, `Analyze ${file}`)
  )
);

// Reduce: Combine results
const finalReport = combineAnalyses(analyses);
```

**3. Hierarchical**
```typescript
// CEO Agent
const ceo = new Agent({ name: ‘CEO’ });

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

MCP allows you to **connect data sources** dynamically.

**Without MCP**:
```typescript
// Hard-coded
const githubTool = createGitHubTool();
const notionTool = createNotionTool();
```

**With MCP**:
```typescript
// Automatic discovery
const mcpServers = discoverMCPServers();
const tools = await mcpClient.getToolsFromServers(mcpServers);
// Boom! All GitHub, Notion, etc. tools available
```

#### Create an MCP Server

```typescript
class CustomMCPServer implements MCPServer {
  name = ‘my-service’;
  capabilities = { tools: true, resources: true };

  async listTools(): Promise<MCPTool[]> {
    return [
      {
        name: ‘do_something’,
        description: ‘Does something cool’,
        inputSchema: { /* JSON Schema */ }
      }
    ];
  }

  async callTool(name: string, params: any): Promise<any> {
    switch (name) {
      case ‘do_something’:
        return await this.doSomething(params);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async listResources(): Promise<MCPResource[]> {
    return [
      {
        uri: ‘custom://resource/123’,
        name: ‘My Resource’,
        description: ‘A cool resource’
      }
    ];
  }

  async readResource(uri: string): Promise<string> {
    // Fetch and return resource content
  }
}
```

---

### 8. Skills (Reusable Workflows)

#### Concept

**Skills** are sequences of complex actions, packaged as a command.

```typescript
const codeReviewSkill: Skill = {
  name: ‘Code Review’,
  command: ‘/review-code’,

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
// Simple skill
const testSkill = createSkill(‘/test’, runTests);
const buildSkill = createSkill(‘/build’, runBuild);

// Composite skill
const ciSkill = composeSkills(‘/ci’, [
  testSkill,
  buildSkill,
  deploySkill
]);
```

---

### 9. Hooks (Extensibility)

#### Concept

**Hooks** allow you to inject code at key moments.

```typescript
// Hook: Logger
agent.onHook(‘beforeToolExecution’, async ({ data }) => {
  console.log(`🔧 Executing: ${data.toolCall.toolName}`);
});

// Hook: Analytics
agent.onHook(‘afterToolExecution’, async ({ data }) => {
  analytics.track(‘tool_used’, {
    tool: data.toolCall.toolName,
    success: data.result.success
});
});

// Hook: Security
agent.onHook(‘beforeToolExecution’, async ({ data }) => {
  if (isDangerous(data.toolCall)) {
    throw new Error(‘Blocked for security’);
  }
});

// Hook: Cost Tracking
let totalCost = 0;
agent.onHook(‘afterThink’, async ({ data }) => {
  const cost = calculateCost(data.response.metadata.usage);
  totalCost += cost;
  console.log(`💰 Total: $${totalCost.toFixed(2)}`);
});
```

---

### 10. Agent Modes

#### Autonomous Mode
The agent decides everything on its own:
```typescript
const agent = new Agent({
  mode: ‘autonomous’,
  maxIterations: 50
});

await agent.execute(‘Deploy the app to production’);
// The agent will:
// 1. Run tests
// 2. Build
// 3. Upload
// 4. Notify
// Without asking for confirmation
```

#### Interactive Mode
The agent asks for confirmation:
```typescript
const agent = new Agent({
  mode: ‘interactive’
});

await agent.execute(‘Delete all user data’);
// The agent will ask:
// “⚠️ This will delete all data. Confirm? (y/n)”
```

#### Planning Mode
The agent creates a plan first:
```typescript
const agent = new Agent({
  mode: ‘planning’
});

await agent.execute(‘Refactor the codebase’);
// The agent returns:
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
