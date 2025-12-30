/**
 * DEFI AGENT EXAMPLE
 *
 * Exemple complet d'un agent DeFi intelligent utilisant Claude.
 * Cet agent peut vous aider avec vos recherches DeFi et crypto.
 */

import dotenv from 'dotenv';
import { ClaudeAgent } from '../core/claude-agent';
import { globalToolRegistry } from '../core/tool-registry';
import { fileTools } from '../tools/file-tools';
import { utilityTools } from '../tools/utility-tools';
import { defiTools } from '../tools/defi-tools';
import { socialMonitoringTools } from '../tools/social-monitoring-tools';
import { AgentConfig } from '../types/agent.types';

// Charger les variables d'environnement
dotenv.config();

/**
 * Configuration des outils pour l'agent DeFi
 */
function setupDefiTools() {
  console.log('🔧 === Setting up DeFi Tools ===\n');

  // Enregistrer tous les outils
  globalToolRegistry.registerMultiple([
    ...fileTools,
    ...utilityTools,
    ...defiTools,
    ...socialMonitoringTools,
  ]);

  console.log(`✅ Registered ${globalToolRegistry.size} tools total\n`);
  console.log('🛠️ Available tools:');
  globalToolRegistry.listTools().forEach(tool => {
    const category = getCategoryFromToolName(tool.name);
    console.log(`  ${category} ${tool.name}: ${tool.description}`);
  });
  console.log();
}

/**
 * Créer la configuration de l'agent DeFi
 */
function createDefiAgentConfig(): AgentConfig {
  return {
    name: 'DeFi Research Assistant',
    description: 'Agent intelligent spécialisé dans la recherche DeFi, crypto et l\'analyse des opportunités',

    systemPrompt: `You are an expert DeFi and crypto assistant, specialized in research and opportunity analysis.

YOUR CAPABILITIES:
- 📊 Crypto price and metrics analysis (via CoinGecko)
- 💰 DeFi protocol research and TVL data (via DeFiLlama)
- 📰 Crypto and DeFi news monitoring
- 📱 Social signals monitoring (Discord, Twitter, Telegram)
- 🎯 Alpha opportunity identification
- 📈 Market sentiment analysis

COMMUNICATION STYLE:
- Always respond in English
- Be direct and informative
- Use emojis to make information clear
- Highlight important information
- Provide practical and actionable advice

PRIORITIES:
1. Safety first (flag risks)
2. Verified and up-to-date information
3. Time-sensitive opportunities prioritized
4. Critical trend analysis

Use your tools to provide accurate data and relevant analysis.`,

    // Tous les outils DeFi disponibles
    tools: [
      // Outils crypto et DeFi
      'get_crypto_price',
      'get_defi_tvl',
      'get_crypto_news',
      'get_market_sentiment',

      // Outils de monitoring social
      'monitor_discord',
      'monitor_twitter',
      'monitor_telegram',
      'find_crypto_alpha',

      // Outils utilitaires
      'calculator',
      'get_timestamp',
      'read_file',
      'write_file',
      'wait',
    ],

    mode: 'autonomous',

    // Permettre la création de subagents spécialisés
    canSpawnSubagents: true,
    maxSubagents: 3,

    // Configuration de mémoire avec persistance
    memoryConfig: {
      enabled: true,
      persistToDisk: true,
      memoryPath: './memory',
    },

    // Limites de sécurité
    maxIterations: 20,
  };
}

/**
 * Exemples de tâches DeFi
 */
const EXAMPLE_TASKS = [
  "📊 What's the current Ethereum and Bitcoin price? Also show me market sentiment",
  "🔍 Find me the top 5 DeFi protocols by TVL right now",
  "📰 What are the latest important crypto news?",
  "🎯 Find alpha opportunities on social networks",
  "💰 Compare prices of Solana, Cardano and Polygon",
  "📈 Analyze the Fear & Greed sentiment and explain what it means",
  "🚀 Monitor Discord and Telegram for airdrop discussions",
  "📊 Give me a complete DeFi market overview today",
];

/**
 * Fonction principale
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                   🚀 DEFI AGENT DEMO 🚀                     ║');
  console.log('║          Agent intelligent pour la recherche DeFi           ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Vérifier la configuration
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY non configurée dans .env');
    console.log('\n📝 Pour utiliser cet agent:');
    console.log('1. Créez un fichier .env à la racine du projet');
    console.log('2. Ajoutez: ANTHROPIC_API_KEY=votre_clé_api');
    console.log('3. Obtenez votre clé sur: https://console.anthropic.com/');
    return;
  }

  // Setup des outils
  setupDefiTools();

  // Créer l'agent
  console.log('🤖 === Creating DeFi Agent ===\n');
  const config = createDefiAgentConfig();
  const claudeConfig = {
    apiKey: process.env.ANTHROPIC_API_KEY!,
    model: 'claude-3-haiku-20240307',
    maxTokens: 4000,
    temperature: 0.1,
  };

  const agent = new ClaudeAgent(config, globalToolRegistry, claudeConfig);

  console.log(`✅ Agent created: ${config.name}`);
  console.log(`🆔 Agent ID: ${agent.getState().id}\n`);

  // Mode interactif ou démonstration
  if (process.argv.includes('--demo')) {
    await runDemo(agent);
  } else {
    await runInteractiveMode(agent);
  }
}

/**
 * Mode démonstration avec tâches prédéfinies
 */
async function runDemo(agent: ClaudeAgent) {
  console.log('🎭 === DEMO MODE ===\n');
  console.log('Exécution de quelques tâches DeFi d\'exemple...\n');

  const demoTasks = [
    "What's the current Ethereum price? Also show me the market sentiment",
    "What are the top 3 DeFi protocols by TVL?",
    "Give me the latest important crypto news",
  ];

  for (let i = 0; i < demoTasks.length; i++) {
    console.log(`\n📝 === TÂCHE ${i + 1}/${demoTasks.length} ===`);
    console.log(`Question: ${demoTasks[i]}\n`);

    const response = await agent.execute(demoTasks[i]);
    console.log(`\n🤖 Réponse: ${response.message}\n`);

    console.log('─'.repeat(80));

    if (i < demoTasks.length - 1) {
      console.log('⏳ Attente 3 secondes...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  console.log('\n✅ Demo terminée!');
  showInteractiveInstructions();
}

/**
 * Mode interactif
 */
async function runInteractiveMode(agent: ClaudeAgent) {
  console.log('💬 === MODE INTERACTIF ===\n');
  console.log('🎯 Exemples de questions que vous pouvez poser:');
  EXAMPLE_TASKS.forEach((task, i) => {
    console.log(`   ${i + 1}. ${task}`);
  });
  console.log('\n💡 Tapez votre question ou "exit" pour quitter...\n');

  // Simulation mode interactif (en réalité, vous utiliseriez readline)
  const exampleTask = EXAMPLE_TASKS[0];
  console.log(`📝 Exemple d'exécution: "${exampleTask}"\n`);

  const response = await agent.execute(exampleTask);
  console.log(`\n🤖 Réponse: ${response.message}\n`);

  showInteractiveInstructions();
}

/**
 * Affiche les instructions pour utilisation interactive
 */
function showInteractiveInstructions() {
  console.log('\n📚 === INSTRUCTIONS D\'UTILISATION ===');
  console.log('\n1. 🔑 Configuration requise (.env):');
  console.log('   ANTHROPIC_API_KEY=votre_clé_api');
  console.log('\n2. 🚀 Lancer l\'agent:');
  console.log('   npm run dev (mode interactif)');
  console.log('   npm run dev -- --demo (mode démonstration)');
  console.log('\n3. 💰 APIs utilisées (gratuites):');
  console.log('   - CoinGecko (prix crypto)');
  console.log('   - DeFiLlama (TVL DeFi)');
  console.log('   - Alternative.me (Fear & Greed)');
  console.log('\n4. 🔧 Outils sociaux (configuration optionnelle):');
  console.log('   - DISCORD_BOT_TOKEN');
  console.log('   - TWITTER_BEARER_TOKEN');
  console.log('   - TELEGRAM_BOT_TOKEN');
}

/**
 * Catégorise les outils pour l'affichage
 */
function getCategoryFromToolName(name: string): string {
  if (name.includes('crypto') || name.includes('defi') || name.includes('market')) return '💰';
  if (name.includes('monitor') || name.includes('twitter') || name.includes('discord') || name.includes('telegram')) return '📱';
  if (name.includes('file') || name.includes('read') || name.includes('write')) return '📁';
  if (name.includes('alpha') || name.includes('find')) return '🎯';
  return '🔧';
}

// Exécuter si lancé directement
if (require.main === module) {
  main().catch(console.error);
}

export { main };