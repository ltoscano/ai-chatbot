import { tool } from 'ai';
import { z } from 'zod';
import { createMcpTools } from '@agentic/mcp';
import { createAISDKTools } from '@agentic/ai-sdk';

// Global cache per i client MCP per evitare connessioni multiple
const mcpClientCache = new Map<string, any>();

export const mcpHub = tool({
  description:
    'Connect to an MCP (Model Context Protocol) hub to access remote tools and services',
  parameters: z.object({
    action: z
      .enum(['list_tools', 'call_tool'])
      .describe('Action to perform on the MCP hub'),
    tool_name: z
      .string()
      .optional()
      .describe('Name of the tool to call (required for call_tool action)'),
    tool_parameters: z
      .record(z.any())
      .optional()
      .describe('Parameters to pass to the tool (for call_tool action)'),
  }),
  execute: async ({ action, tool_name, tool_parameters }) => {
    const mcpHubUrl = process.env.MCP_HUB_URL;

    if (!mcpHubUrl) {
      throw new Error('MCP_HUB_URL environment variable is not configured');
    }

    try {
      // Ottieni o crea il client MCP dalla cache
      let mcpToolsInstance = mcpClientCache.get(mcpHubUrl);

      if (!mcpToolsInstance) {
        // Crea una nuova connessione MCP usando SSE
        mcpToolsInstance = await createMcpTools({
          name: 'mcp-hub-client',
          version: '1.0.0',
          serverUrl: mcpHubUrl, // Connessione SSE al server remoto
          rawToolResponses: false, // Processa le risposte per compatibilità AI SDK
        });

        mcpClientCache.set(mcpHubUrl, mcpToolsInstance);
      }

      if (action === 'list_tools') {
        // Converte i tools MCP in formato AI SDK per ottenere informazioni
        const aiSdkTools = createAISDKTools(mcpToolsInstance);
        const toolNames = Object.keys(aiSdkTools);

        // Ottieni le informazioni sui tools
        const tools = toolNames.map((name) => {
          const tool = aiSdkTools[name];
          return {
            name,
            description: tool.description || 'No description available',
            parameters: tool.parameters || {},
          };
        });

        return {
          success: true,
          action: 'list_tools',
          tools,
          message: `Found ${tools.length} available tools`,
        };
      } else if (action === 'call_tool') {
        if (!tool_name) {
          throw new Error('tool_name is required for call_tool action');
        }

        // Converte i tools MCP in formato AI SDK
        const aiSdkTools = createAISDKTools(mcpToolsInstance);

        // Trova il tool specifico
        const targetTool = aiSdkTools[tool_name];
        if (!targetTool) {
          const availableTools = Object.keys(aiSdkTools);
          throw new Error(
            `Tool '${tool_name}' not found. Available tools: ${availableTools.join(', ')}`,
          );
        }

        // Esegui il tool con i parametri forniti usando l'API corretta
        const result = await targetTool.execute(tool_parameters || {}, {
          toolCallId: 'mcp-hub-call',
          messages: [],
        });

        return {
          success: true,
          action: 'call_tool',
          tool_name,
          result,
          message: `Successfully executed tool: ${tool_name}`,
        };
      }

      throw new Error(`Unknown action: ${action}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // In caso di errore di connessione, rimuovi dalla cache per forzare riconnessione
      if (
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout')
      ) {
        mcpClientCache.delete(mcpHubUrl);
      }

      return {
        success: false,
        action,
        error: errorMessage,
        message: `Failed to execute MCP hub action: ${action}`,
      };
    }
  },
});
