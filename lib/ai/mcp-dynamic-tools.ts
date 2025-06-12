import { tool } from 'ai';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Cache per i client MCP
const mcpClientCache = new Map<string, Client>();

// Cache per i tool dinamici
let dynamicToolsCache: Record<string, any> | null = null;
let lastDiscoveryTime = 0;
const DISCOVERY_CACHE_TTL = 5 * 60 * 1000; // 5 minuti

// Funzione per creare il trasporto giusto
function createTransport(url: string) {
  if (url.includes('/sse')) {
    return new SSEClientTransport(new URL(url));
  } else {
    return new StreamableHTTPClientTransport(new URL(url));
  }
}

// Funzione per ottenere o creare un client MCP
async function getMcpClient(url: string): Promise<Client> {
  let client = mcpClientCache.get(url);

  if (!client) {
    client = new Client(
      {
        name: 'mcp-dynamic-discovery',
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

// Converte il JSON Schema in Zod Schema (semplificato)
function jsonSchemaToZod(jsonSchema: any): z.ZodType<any> {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    return z.any();
  }

  switch (jsonSchema.type) {
    case 'string':
      return z.string();
    case 'number':
      return z.number();
    case 'boolean':
      return z.boolean();
    case 'array':
      if (jsonSchema.items) {
        return z.array(jsonSchemaToZod(jsonSchema.items));
      }
      return z.array(z.any());
    case 'object':
      if (jsonSchema.properties) {
        const shape: Record<string, z.ZodType<any>> = {};
        for (const [key, prop] of Object.entries(jsonSchema.properties)) {
          shape[key] = jsonSchemaToZod(prop as any);

          // Gestisce i campi opzionali
          if (!jsonSchema.required || !jsonSchema.required.includes(key)) {
            shape[key] = shape[key].optional();
          }
        }
        return z.object(shape);
      }
      return z.record(z.any());
    default:
      return z.any();
  }
}

// Scopre e registra i tool MCP come tool nativi
export async function discoverAndRegisterMcpTools(): Promise<
  Record<string, any>
> {
  const now = Date.now();

  // Usa la cache se è ancora valida
  if (dynamicToolsCache && now - lastDiscoveryTime < DISCOVERY_CACHE_TTL) {
    return dynamicToolsCache;
  }

  const mcpHubUrl = process.env.MCP_HUB_URL;
  if (!mcpHubUrl) {
    console.warn('MCP_HUB_URL not configured, skipping MCP tool discovery');
    return {};
  }

  try {
    console.log('🔍 Discovering MCP tools from:', mcpHubUrl);

    const client = await getMcpClient(mcpHubUrl);
    const response = await client.listTools();

    const dynamicTools: Record<string, any> = {};

    for (const mcpTool of response.tools) {
      const toolName = `mcp_${mcpTool.name}`;

      // Converte il JSON Schema in Zod Schema
      const zodSchema = jsonSchemaToZod(mcpTool.inputSchema);

      // Crea il tool nativo che wrappa la chiamata MCP
      dynamicTools[toolName] = tool({
        description: `[MCP] ${mcpTool.description || `Tool from MCP: ${mcpTool.name}`}`,
        parameters: zodSchema,
        execute: async (parameters) => {
          try {
            console.log(`🔧 Executing MCP tool: ${mcpTool.name}`);

            const result = await client.callTool({
              name: mcpTool.name,
              arguments: parameters,
            });

            // Restituisce il contenuto in formato stringa o oggetto
            if (result.content && Array.isArray(result.content)) {
              if (
                result.content.length === 1 &&
                result.content[0].type === 'text'
              ) {
                return {
                  success: true,
                  result: result.content[0].text,
                  message: `Successfully executed MCP tool: ${mcpTool.name}`,
                };
              }
              return {
                success: true,
                content: result.content,
                message: `Successfully executed MCP tool: ${mcpTool.name}`,
              };
            }

            return {
              success: true,
              result: `Tool ${mcpTool.name} executed successfully`,
              message: `Successfully executed MCP tool: ${mcpTool.name}`,
            };
          } catch (error) {
            console.error(
              `❌ Error executing MCP tool ${mcpTool.name}:`,
              error,
            );

            // Invece di lanciare un'eccezione, ritorniamo un oggetto di errore
            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';
            return {
              success: false,
              error: errorMessage,
              toolName: mcpTool.name,
              message: `Failed to execute MCP tool ${mcpTool.name}: ${errorMessage}`,
            };
          }
        },
      });

      console.log(`✅ Registered MCP tool as native: ${toolName}`);
    }

    dynamicToolsCache = dynamicTools;
    lastDiscoveryTime = now;

    console.log(
      `🎉 Discovered and registered ${Object.keys(dynamicTools).length} MCP tools`,
    );
    return dynamicTools;
  } catch (error) {
    console.error('❌ Failed to discover MCP tools:', error);
    return dynamicToolsCache || {};
  }
}

// Funzione per ottenere tutti i tool (cache + refresh se necessario)
export async function getMcpTools(): Promise<Record<string, any>> {
  return await discoverAndRegisterMcpTools();
}

// Funzione per invalidare la cache (utile per debug)
export function invalidateMcpToolsCache(): void {
  dynamicToolsCache = null;
  lastDiscoveryTime = 0;
  console.log('🗑️ MCP tools cache invalidated');
}
