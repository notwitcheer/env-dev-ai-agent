/**
 * BASIC AGENT EXAMPLE
 *
 * Ce fichier démontre comment utiliser le système d'agents.
 * Il montre les concepts clés en action.
 */

import { Agent } from '../core/agent';
import { globalToolRegistry } from '../core/tool-registry';
import { fileTools } from '../tools/file-tools';
import { utilityTools } from '../tools/utility-tools';
import { AgentConfig } from '../types/agent.types';

/**
 * ÉTAPE 1: Enregistrer les outils
 *
 * Avant de créer un agent, on doit enregistrer les outils
 * qu'il pourra utiliser dans le registre global.
 */
function setupTools() {
  console.log('=== Setting up tools ===\n');

  // Enregistrer les outils de fichiers
  globalToolRegistry.registerMultiple(fileTools);

  // Enregistrer les outils utilitaires
  globalToolRegistry.registerMultiple(utilityTools);

  console.log(`Registered ${globalToolRegistry.size} tools total\n`);
  console.log('Available tools:');
  globalToolRegistry.listTools().forEach(tool => {
    console.log(`  - ${tool.name}: ${tool.description}`);
  });
  console.log();
}

/**
 * ÉTAPE 2: Créer une configuration d'agent
 *
 * La configuration définit:
 * - Qui est l'agent (nom, description)
 * - Ce qu'il peut faire (outils)
 * - Comment il se comporte (mode, limites)
 */
function createAgentConfig(): AgentConfig {
  return {
    name: 'Assistant',
    description: 'A helpful assistant that can perform various tasks',

    systemPrompt: `You are a helpful assistant. You can:
- Perform calculations
- Read and write files
- List directories
- Get timestamps

Always be helpful and explain what you're doing.`,

    // Donner accès à tous les outils
    tools: [
      'calculator',
      'read_file',
      'write_file',
      'list_directory',
      'get_timestamp',
      'wait',
    ],

    mode: 'interactive',

    // Permettre la création de subagents
    canSpawnSubagents: true,
    maxSubagents: 3,

    // Configuration de mémoire
    memoryConfig: {
      enabled: true,
      persistToDisk: false, // Pour la démo, on ne persiste pas
    },

    // Limites de sécurité
    maxIterations: 10,
  };
}

/**
 * ÉTAPE 3: Créer et utiliser l'agent
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   MULTI-AGENT DEVELOPMENT ENVIRONMENT DEMO   ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  // Setup
  setupTools();

  // Créer l'agent
  console.log('=== Creating agent ===\n');
  const config = createAgentConfig();
  const agent = new Agent(config, globalToolRegistry);
  console.log(`Agent created: ${config.name}`);
  console.log(`Agent ID: ${agent.getState().id}\n`);

  // DEMO 1: Calcul simple
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║ DEMO 1: Calculator Tool                       ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  await agent.execute('Calculate 15 * 23 + 100');
  console.log();

  // DEMO 2: Timestamp
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║ DEMO 2: Timestamp Tool                        ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  await agent.execute('What time is it?');
  console.log();

  // DEMO 3: List directory
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║ DEMO 3: File System Tools                     ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  await agent.execute('List .');
  console.log();

  // DEMO 4: Afficher la mémoire
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║ DEMO 4: Agent Memory                          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const memory = agent.getMemory();
  console.log('Memory Stats:', memory.getStats());
  console.log('\nStored values:');
  console.log(memory.getAll());
  console.log('\nConversation history:');
  memory.getMessages().forEach((msg, idx) => {
    console.log(`  ${idx + 1}. [${msg.role}] ${msg.content.substring(0, 80)}...`);
  });
  console.log();

  // DEMO 5: State de l'agent
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║ DEMO 5: Agent State                           ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  const state = agent.getState();
  console.log('Agent Status:', state.status);
  console.log('Iterations:', state.iterations);
  console.log('Session ID:', state.context.sessionId);
  console.log('Available Tools:', state.context.availableTools);
  console.log('Subagents:', state.subagents.size);
  console.log();

  console.log('╔════════════════════════════════════════════════╗');
  console.log('║ Demo completed successfully! ✓                ║');
  console.log('╚════════════════════════════════════════════════╝');
}

// Exécuter la démo
if (require.main === module) {
  main().catch(console.error);
}

export { main };
