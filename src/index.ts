/**
 * MULTI-AGENT DEVELOPMENT ENVIRONMENT
 *
 * Point d'entrée principal du framework.
 * Exporte tous les composants essentiels.
 */

// Core components
export { Agent } from './core/agent';
export { ToolRegistry, globalToolRegistry } from './core/tool-registry';

// Memory system
export { MemoryManager } from './memory/memory-manager';

// Types
export * from './types/agent.types';

// Built-in tools
export { fileTools } from './tools/file-tools';
export { utilityTools } from './tools/utility-tools';

// Version
export const VERSION = '1.0.0';

console.log(`Multi-Agent Development Environment v${VERSION} loaded`);
