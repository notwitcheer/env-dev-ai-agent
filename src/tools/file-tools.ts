/**
 * FILE TOOLS
 *
 * Outils pour interagir avec le système de fichiers.
 * Ces outils permettent aux agents de lire/écrire des fichiers.
 *
 * CONCEPT: Chaque outil est une fonction asynchrone qui retourne ToolResult
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { Tool, ToolResult } from '../types/agent.types';

/**
 * READ FILE TOOL
 * Permet de lire le contenu d'un fichier
 */
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Reads the content of a file from the filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'The path to the file to read',
      required: true,
      schema: z.string().min(1),
    },
  ],
  requiresPermission: true,
  permissionLevel: 'read',

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const content = await fs.readFile(params.path, 'utf-8');
      return {
        success: true,
        data: {
          path: params.path,
          content,
          size: content.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to read file: ${error.message}`,
      };
    }
  },
};

/**
 * WRITE FILE TOOL
 * Permet d'écrire du contenu dans un fichier
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Writes content to a file on the filesystem',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'The path where to write the file',
      required: true,
      schema: z.string().min(1),
    },
    {
      name: 'content',
      type: 'string',
      description: 'The content to write to the file',
      required: true,
      schema: z.string(),
    },
  ],
  requiresPermission: true,
  permissionLevel: 'write',

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      await fs.writeFile(params.path, params.content, 'utf-8');
      return {
        success: true,
        data: {
          path: params.path,
          bytesWritten: params.content.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to write file: ${error.message}`,
      };
    }
  },
};

/**
 * LIST DIRECTORY TOOL
 * Liste les fichiers dans un répertoire
 */
export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: 'Lists all files and directories in a given path',
  parameters: [
    {
      name: 'path',
      type: 'string',
      description: 'The directory path to list',
      required: true,
      schema: z.string().min(1),
    },
  ],
  requiresPermission: true,
  permissionLevel: 'read',

  async execute(params: Record<string, any>): Promise<ToolResult> {
    try {
      const files = await fs.readdir(params.path, { withFileTypes: true });
      const items = files.map(file => ({
        name: file.name,
        type: file.isDirectory() ? 'directory' : 'file',
        path: join(params.path, file.name),
      }));

      return {
        success: true,
        data: {
          path: params.path,
          items,
          count: items.length,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to list directory: ${error.message}`,
      };
    }
  },
};

// Export tous les file tools comme un array
export const fileTools: Tool[] = [
  readFileTool,
  writeFileTool,
  listDirectoryTool,
];
