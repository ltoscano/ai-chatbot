import { tool } from 'ai';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Global cache per i client MCP per evitare connessioni multiple
const mcpClientCache = new Map<string, Client>();

// Funzione per determinare il tipo di trasporto dalla URL
function createTransport(url: string) {
  const parsedUrl = new URL(url);

  // Se l'URL termina con /sse o contiene "sse" nel path, usa SSE
  if (
    parsedUrl.pathname.endsWith('/sse') ||
    parsedUrl.pathname.includes('/sse')
  ) {
    return new SSEClientTransport(parsedUrl);
  }

  // Altrimenti usa HTTP Streaming (più efficiente per payloads grandi)
  return new StreamableHTTPClientTransport(parsedUrl);
}

// Funzione per ottenere o creare un client MCP
async function getMcpClient(url: string): Promise<Client> {
  let client = mcpClientCache.get(url);

  if (!client || !client.transport?.isConnected) {
    client = new Client(
      {
        name: 'mcp-hub-client',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      },
    );

    const transport = createTransport(url);
    await client.connect(transport);

    mcpClientCache.set(url, client);
  }

  return client;
}

export const mcpHub = tool({
  description:
    'Connect to an MCP (Model Context Protocol) hub to access remote tools and services using FastMCP',
  parameters: z.object({
    action: z
      .enum([
        'list_tools',
        'call_tool',
        'list_resources',
        'read_resource',
        'list_prompts',
        'get_prompt',
      ])
      .describe('Action to perform on the MCP hub'),
    tool_name: z
      .string()
      .optional()
      .describe('Name of the tool to call (required for call_tool action)'),
    tool_parameters: z
      .record(z.any())
      .optional()
      .describe('Parameters to pass to the tool (for call_tool action)'),
    resource_uri: z
      .string()
      .optional()
      .describe(
        'URI of the resource to read (required for read_resource action)',
      ),
    prompt_name: z
      .string()
      .optional()
      .describe('Name of the prompt to get (required for get_prompt action)'),
    prompt_arguments: z
      .record(z.any())
      .optional()
      .describe('Arguments to pass to the prompt (for get_prompt action)'),
  }),
  execute: async ({
    action,
    tool_name,
    tool_parameters,
    resource_uri,
    prompt_name,
    prompt_arguments,
  }) => {
    const mcpHubUrl = process.env.MCP_HUB_URL;

    if (!mcpHubUrl) {
      throw new Error('MCP_HUB_URL environment variable is not configured');
    }

    try {
      const client = await getMcpClient(mcpHubUrl);

      switch (action) {
        case 'list_tools': {
          const response = await client.listTools();
          const tools = response.tools.map((tool) => ({
            name: tool.name,
            description: tool.description || 'No description available',
            inputSchema: tool.inputSchema || {},
          }));

          return {
            success: true,
            action: 'list_tools',
            tools,
            message: `Found ${tools.length} available tools`,
          };
        }

        case 'call_tool': {
          if (!tool_name) {
            throw new Error('tool_name is required for call_tool action');
          }

          const result = await client.callTool({
            name: tool_name,
            arguments: tool_parameters || {},
          });

          return {
            success: true,
            action: 'call_tool',
            tool_name,
            result: result.content,
            message: `Successfully executed tool: ${tool_name}`,
          };
        }

        case 'list_resources': {
          const response = await client.listResources();
          const resources = response.resources.map((resource) => ({
            uri: resource.uri,
            name: resource.name || 'Unnamed resource',
            description: resource.description || 'No description available',
            mimeType: resource.mimeType || 'unknown',
          }));

          return {
            success: true,
            action: 'list_resources',
            resources,
            message: `Found ${resources.length} available resources`,
          };
        }

        case 'read_resource': {
          if (!resource_uri) {
            throw new Error(
              'resource_uri is required for read_resource action',
            );
          }

          const result = await client.readResource({ uri: resource_uri });

          return {
            success: true,
            action: 'read_resource',
            resource_uri,
            result: result.contents,
            message: `Successfully read resource: ${resource_uri}`,
          };
        }

        case 'list_prompts': {
          const response = await client.listPrompts();
          const prompts = response.prompts.map((prompt) => ({
            name: prompt.name,
            description: prompt.description || 'No description available',
            arguments: prompt.arguments || [],
          }));

          return {
            success: true,
            action: 'list_prompts',
            prompts,
            message: `Found ${prompts.length} available prompts`,
          };
        }

        case 'get_prompt': {
          if (!prompt_name) {
            throw new Error('prompt_name is required for get_prompt action');
          }

          const result = await client.getPrompt({
            name: prompt_name,
            arguments: prompt_arguments || {},
          });

          return {
            success: true,
            action: 'get_prompt',
            prompt_name,
            result: result.messages,
            message: `Successfully retrieved prompt: ${prompt_name}`,
          };
        }

        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      // In caso di errore di connessione, rimuovi dalla cache per forzare riconnessione
      if (
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('transport')
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
