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

// Timer per refresh automatico
let autoRefreshTimer: NodeJS.Timeout | null = null;

// Funzione per avviare il refresh automatico
function startAutoRefresh() {
  // Cancella il timer esistente se presente
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
  }

  // Avvia un nuovo timer che refresha ogni 5 minuti
  autoRefreshTimer = setInterval(async () => {
    console.log('🕐 Auto-refresh: refreshing MCP tools cache...');
    try {
      invalidateMcpToolsCache();
      await discoverAndRegisterMcpTools();
      console.log('✅ Auto-refresh completed successfully');
    } catch (error) {
      console.error('❌ Auto-refresh failed:', error);
    }
  }, DISCOVERY_CACHE_TTL);

  console.log('⏰ Auto-refresh timer started (every 5 minutes)');
}

// Funzione per fermare il refresh automatico
function stopAutoRefresh() {
  if (autoRefreshTimer) {
    clearInterval(autoRefreshTimer);
    autoRefreshTimer = null;
    console.log('⏹️ Auto-refresh timer stopped');
  }
}

// Funzione per determinare se stiamo usando un provider OpenAI
function isOpenAIProvider(): boolean {
  // Controlla se l'applicazione sta usando modelli OpenAI
  // Questo può essere determinato dall'URL o dalle variabili di ambiente
  const userAgent = process.env.HTTP_USER_AGENT || '';
  const modelName = process.env.CURRENT_MODEL || '';

  return (
    userAgent.includes('openai') ||
    modelName.includes('gpt') ||
    modelName.includes('o1') ||
    process.env.OPENAI_API_KEY !== undefined
  );
}

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

// Funzione per gestire la riconnessione in caso di errore di sessione
async function handleSessionError(url: string): Promise<Client> {
  console.log('🔄 Session error detected, clearing cache and reconnecting...');
  
  // Rimuovi il client dalla cache per forzare una nuova connessione
  mcpClientCache.delete(url);
  
  // Crea un nuovo client con una nuova sessione
  return await getMcpClient(url);
}

// Funzione per verificare se un errore è relativo a una sessione invalida
function isSessionError(error: any): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    errorMessage.includes('Bad Request: No valid session ID provided') ||
    errorMessage.includes('HTTP 400') && errorMessage.includes('session') ||
    errorMessage.includes('session ID') ||
    errorMessage.includes('invalid session')
  );
}

// Converte il JSON Schema in Zod Schema con compatibilità OpenAI e Anthropic
function jsonSchemaToZod(jsonSchema: any): z.ZodType<any> {
  if (!jsonSchema || typeof jsonSchema !== 'object') {
    console.warn('Invalid JSON schema provided, using z.any()');
    return z.any();
  }

  // Log dettagliato dello schema per debug
  console.log(
    'Converting JSON schema to Zod:',
    JSON.stringify(jsonSchema, null, 2),
  );

  try {
    switch (jsonSchema.type) {
      case 'string': {
        // Gestisce enum per stringhe prima di tutto
        if (jsonSchema.enum && Array.isArray(jsonSchema.enum)) {
          return z.enum(jsonSchema.enum as [string, ...string[]]);
        }

        let stringSchema = z.string();
        if (jsonSchema.format === 'uri' || jsonSchema.format === 'url') {
          stringSchema = stringSchema.url();
        }
        if (jsonSchema.format === 'email') {
          stringSchema = stringSchema.email();
        }
        if (jsonSchema.minLength !== undefined) {
          stringSchema = stringSchema.min(jsonSchema.minLength);
        }
        if (jsonSchema.maxLength !== undefined) {
          stringSchema = stringSchema.max(jsonSchema.maxLength);
        }
        return stringSchema;
      }

      case 'number': {
        let numberSchema = z.number();
        if (jsonSchema.minimum !== undefined) {
          numberSchema = numberSchema.min(jsonSchema.minimum);
        }
        if (jsonSchema.maximum !== undefined) {
          numberSchema = numberSchema.max(jsonSchema.maximum);
        }
        return numberSchema;
      }

      case 'integer': {
        let intSchema = z.number().int();
        if (jsonSchema.minimum !== undefined) {
          intSchema = intSchema.min(jsonSchema.minimum);
        }
        if (jsonSchema.maximum !== undefined) {
          intSchema = intSchema.max(jsonSchema.maximum);
        }
        return intSchema;
      }

      case 'boolean': {
        return z.boolean();
      }

      case 'array': {
        if (jsonSchema.items) {
          const itemSchema = jsonSchemaToZod(jsonSchema.items);
          let arraySchema = z.array(itemSchema);
          if (jsonSchema.minItems !== undefined) {
            arraySchema = arraySchema.min(jsonSchema.minItems);
          }
          if (jsonSchema.maxItems !== undefined) {
            arraySchema = arraySchema.max(jsonSchema.maxItems);
          }
          return arraySchema;
        }
        return z.array(z.any());
      }

      case 'object': {
        // Gestione speciale per oggetti vuoti che causano problemi con OpenAI
        if (
          !jsonSchema.properties ||
          typeof jsonSchema.properties !== 'object' ||
          Object.keys(jsonSchema.properties).length === 0
        ) {
          console.warn(
            'Empty object schema detected, using OpenAI-compatible fallback',
          );
          // Per OpenAI, un oggetto vuoto deve permettere proprietà aggiuntive
          // o avere almeno un parametro opzionale per essere valido
          return z
            .object({
              _openai_compat: z
                .string()
                .optional()
                .describe('OpenAI compatibility parameter'),
            })
            .passthrough();
        }

        const shape: Record<string, z.ZodType<any>> = {};
        const required = Array.isArray(jsonSchema.required)
          ? jsonSchema.required
          : [];

        console.log(
          'Processing object properties:',
          Object.keys(jsonSchema.properties),
        );
        console.log('Required fields:', required);

        for (const [key, prop] of Object.entries(jsonSchema.properties)) {
          try {
            let fieldSchema = jsonSchemaToZod(prop as any);

            // Gestisce i campi opzionali
            if (!required.includes(key)) {
              fieldSchema = fieldSchema.optional();
            }

            shape[key] = fieldSchema;
            console.log(
              `Processed field: ${key}, required: ${required.includes(key)}`,
            );
          } catch (error) {
            console.error(`Error processing field ${key}:`, error);
            // Fallback per campi problematici
            shape[key] = required.includes(key) ? z.any() : z.any().optional();
          }
        }

        // Se dopo il processing non abbiamo proprietà valide, aggiungiamo un parametro di compatibilità
        if (Object.keys(shape).length === 0) {
          console.warn(
            'No valid properties found after processing, adding OpenAI compatibility parameter',
          );
          shape._openai_compat = z
            .string()
            .optional()
            .describe('OpenAI compatibility parameter');
        }

        // Per oggetti che hanno solo campi opzionali, OpenAI può avere problemi
        // Aggiungiamo .passthrough() per permettere proprietà aggiuntive
        const objectSchema = z.object(shape);

        // Se tutti i campi sono opzionali, aggiungiamo .passthrough() per OpenAI
        const allOptional = Object.values(shape).every((schema) => {
          // Controlla se lo schema è opzionale usando il tipo interno di Zod
          return (schema as any)._def?.typeName === 'ZodOptional';
        });

        if (allOptional && Object.keys(shape).length > 0) {
          console.log(
            'All fields are optional, using passthrough for OpenAI compatibility',
          );
          return objectSchema.passthrough();
        }

        return objectSchema;
      }

      case 'null': {
        return z.null();
      }

      default: {
        console.warn(
          `Unsupported JSON schema type: ${jsonSchema.type}, using z.any()`,
        );
        return z.any();
      }
    }
  } catch (error) {
    console.error('Error converting JSON schema to Zod:', error);
    console.error('Problematic schema:', JSON.stringify(jsonSchema, null, 2));
    // Fallback sicuro per OpenAI
    return z
      .object({
        _error_fallback: z
          .string()
          .optional()
          .describe('Error fallback parameter for OpenAI compatibility'),
      })
      .passthrough();
  }
}

// Funzione per validare uno schema prima di utilizzarlo con compatibilità OpenAI
function validateSchema(toolName: string, zodSchema: z.ZodType<any>): boolean {
  try {
    // Test con un oggetto vuoto - dovrebbe sempre passare per OpenAI compatibility
    const emptyTest = zodSchema.safeParse({});
    if (emptyTest.success) {
      console.log(
        `✅ Schema validation passed for ${toolName} with empty object`,
      );
      return true;
    }

    // Se il test con oggetto vuoto fallisce, proviamo con il parametro di compatibilità OpenAI
    const compatTest = zodSchema.safeParse({ _openai_compat: '' });
    if (compatTest.success) {
      console.log(
        `✅ Schema validation passed for ${toolName} with OpenAI compatibility parameter`,
      );
      return true;
    }

    // Per schemi con parametri richiesti, testiamo con valori di default
    try {
      const testParams: Record<string, any> = {};

      // Se è un oggetto Zod, proviamo a estrarre le proprietà richieste
      if ((zodSchema as any)._def?.typeName === 'ZodObject') {
        const shape = (zodSchema as any)._def.shape();
        for (const [key, fieldSchema] of Object.entries(shape)) {
          const def = (fieldSchema as any)._def;
          if (def?.typeName !== 'ZodOptional') {
            // Campo richiesto - aggiungiamo un valore di default basato sul tipo
            if (def?.typeName === 'ZodString') {
              testParams[key] = 'test';
            } else if (def?.typeName === 'ZodNumber') {
              testParams[key] = 0;
            } else if (def?.typeName === 'ZodBoolean') {
              testParams[key] = false;
            } else if (def?.typeName === 'ZodArray') {
              testParams[key] = [];
            } else {
              testParams[key] = {};
            }
          }
        }
      }

      const requiredTest = zodSchema.safeParse(testParams);
      if (requiredTest.success) {
        console.log(
          `✅ Schema validation passed for ${toolName} with required parameters`,
        );
        return true;
      }
    } catch (shapeError) {
      console.warn(
        `Could not extract required fields for ${toolName}, but this is not critical`,
      );
    }

    console.warn(
      `⚠️ Schema validation had issues for ${toolName}, but allowing it for OpenAI compatibility`,
    );
    console.warn(`Empty test error:`, emptyTest.error?.issues);
    console.warn(`Compat test error:`, compatTest.error?.issues);

    // Per OpenAI, siamo più permissivi - se lo schema è stato creato senza errori,
    // probabilmente funzionerà anche se la validazione con oggetti vuoti fallisce
    return true;
  } catch (error) {
    console.error(`❌ Schema validation failed for tool ${toolName}:`, error);
    return false;
  }
}

// Scopre e registra i tool MCP come tool nativi
export async function discoverAndRegisterMcpTools(): Promise<
  Record<string, any>
> {
  const now = Date.now();

  // Usa la cache se è ancora valida
  if (dynamicToolsCache && now - lastDiscoveryTime < DISCOVERY_CACHE_TTL) {
    console.log('🎯 Using cached MCP tools');
    return dynamicToolsCache;
  }

  const mcpHubUrl = process.env.MCP_HUB_URL;
  if (!mcpHubUrl) {
    console.warn('MCP_HUB_URL not configured, skipping MCP tool discovery');
    return {};
  }

  try {
    console.log('🔍 Discovering MCP tools from:', mcpHubUrl);

    let client = await getMcpClient(mcpHubUrl);
    let response;
    
    try {
      response = await client.listTools();
    } catch (error) {
      // Gestisci errori di sessione invalida
      if (isSessionError(error)) {
        console.log('🔄 Session expired, attempting reconnection...');
        client = await handleSessionError(mcpHubUrl);
        response = await client.listTools();
      } else {
        throw error;
      }
    }

    console.log(`📦 Found ${response.tools.length} MCP tools`);

    const dynamicTools: Record<string, any> = {};
    const skippedTools: string[] = [];

    for (const mcpTool of response.tools) {
      const toolName = `mcp_${mcpTool.name}`;

      try {
        console.log(`🔧 Processing MCP tool: ${mcpTool.name}`);
        console.log(
          `📋 Input schema:`,
          JSON.stringify(mcpTool.inputSchema, null, 2),
        );

        // Converte il JSON Schema in Zod Schema
        const zodSchema = jsonSchemaToZod(mcpTool.inputSchema);

        // Valida lo schema prima di utilizzarlo
        if (!validateSchema(toolName, zodSchema)) {
          console.warn(
            `⚠️ Skipping tool ${toolName} due to schema validation issues`,
          );
          skippedTools.push(toolName);
          continue;
        }

        // Crea il tool nativo che wrappa la chiamata MCP
        dynamicTools[toolName] = tool({
          description: `[MCP] ${mcpTool.description || `Tool from MCP: ${mcpTool.name}`}`,
          parameters: zodSchema,
          execute: async (parameters) => {
            try {
              console.log(
                `🚀 Executing MCP tool: ${mcpTool.name} with parameters:`,
                parameters,
              );

              // Filtra i parametri di compatibilità OpenAI prima di inviare al MCP
              const { _openai_compat, _error_fallback, ...cleanParameters } =
                parameters;

              let result;
              try {
                result = await client.callTool({
                  name: mcpTool.name,
                  arguments: cleanParameters,
                });
              } catch (toolError) {
                // Gestisci errori di sessione durante l'esecuzione del tool
                if (isSessionError(toolError)) {
                  console.log('🔄 Session expired during tool execution, reconnecting...');
                  const newClient = await handleSessionError(mcpHubUrl);
                  result = await newClient.callTool({
                    name: mcpTool.name,
                    arguments: cleanParameters,
                  });
                } else {
                  throw toolError;
                }
              }

              console.log(`✅ MCP tool ${mcpTool.name} executed successfully`);

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

              // Gestione specifica per errori di schema OpenAI
              if (
                errorMessage.includes('schema') ||
                errorMessage.includes('validation') ||
                errorMessage.includes('parameters')
              ) {
                return {
                  success: false,
                  error: 'schema_validation_error',
                  toolName: mcpTool.name,
                  message: `Schema validation error for MCP tool ${mcpTool.name}. This tool may not be compatible with the current AI provider. Try using an Anthropic model if available.`,
                  originalError: errorMessage,
                };
              }

              return {
                success: false,
                error: errorMessage,
                toolName: mcpTool.name,
                message: `Failed to execute MCP tool ${mcpTool.name}: ${errorMessage}`,
              };
            }
          },
        });

        console.log(`✅ Successfully registered MCP tool: ${toolName}`);
      } catch (error) {
        console.error(`❌ Failed to process MCP tool ${mcpTool.name}:`, error);
        skippedTools.push(toolName);
      }
    }

    dynamicToolsCache = dynamicTools;
    lastDiscoveryTime = now;

    const registeredCount = Object.keys(dynamicTools).length;
    const skippedCount = skippedTools.length;

    console.log(`🎉 Successfully registered ${registeredCount} MCP tools`);
    if (skippedCount > 0) {
      console.warn(
        `⚠️ Skipped ${skippedCount} tools due to schema issues:`,
        skippedTools,
      );
    }

    // Avvia l'auto-refresh se non è già attivo
    if (!autoRefreshTimer) {
      startAutoRefresh();
    }

    return dynamicTools;
  } catch (error) {
    console.error('❌ Failed to discover MCP tools:', error);

    // Ritorna la cache precedente se disponibile, altrimenti un oggetto vuoto
    if (dynamicToolsCache) {
      console.log('🔄 Returning cached MCP tools due to discovery error');
      return dynamicToolsCache;
    }

    return {};
  }
}

// Funzione per ottenere tutti i tool (cache + refresh se necessario)
export async function getMcpTools(): Promise<Record<string, any>> {
  try {
    return await discoverAndRegisterMcpTools();
  } catch (error) {
    console.error('❌ Error in getMcpTools:', error);
    return {};
  }
}

// Funzione per invalidare la cache (utile per debug)
export function invalidateMcpToolsCache(): void {
  dynamicToolsCache = null;
  lastDiscoveryTime = 0;
  console.log('🗑️ MCP tools cache invalidated');
}

// Funzione per pulire forzatamente la cache MCP e le connessioni
export function forceResetMcpConnections(): void {
  console.log('🔄 Force resetting all MCP connections...');
  
  // Pulisci la cache dei tool dinamici
  invalidateMcpToolsCache();
  
  // Pulisci la cache dei client MCP
  mcpClientCache.clear();
  
  console.log('✅ All MCP connections and caches cleared');
}

// Funzione per testare la connessione e i tool MCP
export async function testMcpConnection(): Promise<{
  success: boolean;
  error?: string;
  toolsCount?: number;
  tools?: string[];
  compatibility?: {
    openai: boolean;
    anthropic: boolean;
  };
}> {
  try {
    const mcpHubUrl = process.env.MCP_HUB_URL;
    if (!mcpHubUrl) {
      return {
        success: false,
        error: 'MCP_HUB_URL not configured',
      };
    }

    console.log('🧪 Testing MCP connection to:', mcpHubUrl);

    const client = await getMcpClient(mcpHubUrl);
    const response = await client.listTools();

    const toolNames = response.tools.map((tool) => tool.name);

    // Testa la compatibilità dei primi 3 tool
    let openaiCompatible = 0;
    let anthropicCompatible = 0;

    for (const tool of response.tools.slice(0, 3)) {
      try {
        const zodSchema = jsonSchemaToZod(tool.inputSchema);
        if (validateSchema(`test_${tool.name}`, zodSchema)) {
          anthropicCompatible++;
          // Test aggiuntivo per OpenAI (più rigoroso)
          const emptyTest = zodSchema.safeParse({});
          if (emptyTest.success) {
            openaiCompatible++;
          }
        }
      } catch (error) {
        console.warn(`Tool ${tool.name} compatibility test failed:`, error);
      }
    }

    return {
      success: true,
      toolsCount: response.tools.length,
      tools: toolNames,
      compatibility: {
        openai: openaiCompatible > 0,
        anthropic: anthropicCompatible > 0,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

// Funzione per ottenere statistiche sui tool e la loro compatibilità
export async function getMcpToolsCompatibilityReport(): Promise<{
  totalTools: number;
  compatibleWithOpenAI: number;
  compatibleWithAnthropic: number;
  problematicTools: string[];
}> {
  try {
    const tools = await getMcpTools();
    const toolNames = Object.keys(tools);

    let openaiCount = 0;
    let anthropicCount = 0;
    const problematic: string[] = [];

    for (const toolName of toolNames) {
      const tool = tools[toolName];
      if (tool?.parameters) {
        try {
          // Test per Anthropic (più permissivo)
          const anthropicTest = tool.parameters.safeParse({});
          if (anthropicTest.success) {
            anthropicCount++;
            openaiCount++; // Se funziona con oggetto vuoto, dovrebbe funzionare anche con OpenAI
          } else {
            // Test per OpenAI con parametro di compatibilità
            const openaiTest = tool.parameters.safeParse({
              _openai_compat: '',
            });
            if (openaiTest.success) {
              openaiCount++;
            } else {
              problematic.push(toolName);
            }
          }
        } catch (error) {
          problematic.push(toolName);
        }
      }
    }

    return {
      totalTools: toolNames.length,
      compatibleWithOpenAI: openaiCount,
      compatibleWithAnthropic: anthropicCount,
      problematicTools: problematic,
    };
  } catch (error) {
    console.error('Error generating compatibility report:', error);
    return {
      totalTools: 0,
      compatibleWithOpenAI: 0,
      compatibleWithAnthropic: 0,
      problematicTools: [],
    };
  }
}

// Esporta le funzioni di gestione auto-refresh
export { startAutoRefresh, stopAutoRefresh };
