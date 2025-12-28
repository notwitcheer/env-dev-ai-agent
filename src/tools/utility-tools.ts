/**
 * UTILITY TOOLS
 *
 * Outils utilitaires pour des tâches communes
 */

import { z } from 'zod';
import { Tool, ToolResult } from '../types/agent.types';

/**
 * CALCULATOR TOOL
 * Évalue des expressions mathématiques
 */
export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Evaluates mathematical expressions safely',
  parameters: [
    {
      name: 'expression',
      type: 'string',
      description: 'The mathematical expression to evaluate (e.g., "2 + 2 * 3")',
      required: true,
      schema: z.string().min(1),
    },
  ],

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      // Note: En production, utilisez une lib comme math.js pour plus de sécurité
      // Ceci est une version simplifiée pour démonstration
      const expression = params.expression.replace(/[^0-9+\-*/().\s]/g, '');
      const result = eval(expression);

      return {
        success: true,
        data: {
          expression: params.expression,
          result,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to evaluate expression: ${error.message}`,
      };
    }
  },
};

/**
 * WAIT TOOL
 * Attend un certain temps (utile pour démonstrations)
 */
export const waitTool: Tool = {
  name: 'wait',
  description: 'Waits for a specified number of milliseconds',
  parameters: [
    {
      name: 'milliseconds',
      type: 'number',
      description: 'Number of milliseconds to wait',
      required: true,
      schema: z.number().min(0).max(10000),
    },
  ],

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const ms = params.milliseconds;
    await new Promise(resolve => setTimeout(resolve, ms));

    return {
      success: true,
      data: {
        waited: ms,
        message: `Waited ${ms}ms`,
      },
    };
  },
};

/**
 * GET TIMESTAMP TOOL
 * Retourne l'heure actuelle
 */
export const getTimestampTool: Tool = {
  name: 'get_timestamp',
  description: 'Gets the current timestamp in various formats',
  parameters: [
    {
      name: 'format',
      type: 'string',
      description: 'Format: "iso", "unix", or "readable"',
      required: false,
      schema: z.enum(['iso', 'unix', 'readable']).optional(),
    },
  ],

  async execute(params: Record<string, any>): Promise<ToolResult> {
    const now = new Date();
    const format = params.format || 'iso';

    let timestamp: string | number;
    switch (format) {
      case 'unix':
        timestamp = Math.floor(now.getTime() / 1000);
        break;
      case 'readable':
        timestamp = now.toLocaleString();
        break;
      case 'iso':
      default:
        timestamp = now.toISOString();
    }

    return {
      success: true,
      data: {
        timestamp,
        format,
      },
    };
  },
};

export const utilityTools: Tool[] = [
  calculatorTool,
  waitTool,
  getTimestampTool,
];
