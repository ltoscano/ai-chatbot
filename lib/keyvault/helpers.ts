/**
 * Utilità per accedere facilmente alle configurazioni specifiche del keyvault
 * Questo modulo fornisce helper tipizzati per le configurazioni più comuni
 */

import { getConfig, isConfigInitialized, initializeConfig } from './index';

// Esporta anche le funzioni dal modulo principale per convenience
export { isConfigInitialized, initializeConfig, getConfig, getAllConfigs, setConfig, removeConfig, reinitializeConfig } from './index';

/**
 * Interfaccia per le credenziali Vertex AI (primo elemento dell'array)
 */
export interface VertexAICredentials {
  auth_provider_x509_cert_url: string;
  auth_uri: string;
  client_email: string;
  client_id: string;
  client_x509_cert_url: string;
  private_key: string;
  private_key_id: string;
  project_id: string;
  token_uri: string;
  type: string;
  universe_domain: string;
}

/**
 * Interfaccia per la configurazione Vertex AI (secondo elemento dell'array)
 */
export interface VertexAIConfig {
  location: string;
  project: string;
}

/**
 * Ottiene le credenziali Vertex AI dal keyvault
 */
export function getVertexAICredentials(): VertexAICredentials | null {
  try {
    const credentials = getConfig('VERTEX_AI_0');
    return credentials || null;
  } catch (error) {
    console.error('❌ Errore nel recupero delle credenziali Vertex AI:', error);
    return null;
  }
}

/**
 * Ottiene la configurazione Vertex AI dal keyvault
 */
export function getVertexAIConfig(): VertexAIConfig | null {
  try {
    const config = getConfig('VERTEX_AI_1');
    return config || null;
  } catch (error) {
    console.error('❌ Errore nel recupero della configurazione Vertex AI:', error);
    return null;
  }
}

/**
 * Ottiene l'array completo Vertex AI
 */
export function getVertexAIArray(): [VertexAICredentials, VertexAIConfig] | null {
  try {
    const fullArray = getConfig('VERTEX_AI');
    if (Array.isArray(fullArray) && fullArray.length >= 2) {
      return [fullArray[0], fullArray[1]];
    }
    return null;
  } catch (error) {
    console.error('❌ Errore nel recupero dell\'array Vertex AI completo:', error);
    return null;
  }
}

/**
 * Ottiene la chiave API OpenAI
 */
export function getOpenAIKey(): string | null {
  return getConfig('OPENAI_API_KEY');
}

/**
 * Ottiene la chiave API Anthropic
 */
export function getAnthropicKey(): string | null {
  return getConfig('ANTHROPIC_KEY');
}

/**
 * Ottiene la chiave API Google/Gemini
 */
export function getGoogleAPIKey(): string | null {
  return getConfig('GOOGLE_API_KEY') || getConfig('GEMINI_API_KEY');
}

/**
 * Ottiene la configurazione Azure OpenAI
 */
export function getAzureOpenAIConfig() {
  return {
    apiKey: getConfig('AZURE_OPENAI_API_KEY') || getConfig('AZURE_OAI_API_KEY'),
    endpoint: getConfig('AZURE_OPENAI_ENDPOINT') || getConfig('AZURE_OAI_ENDPOINT'),
    apiVersion: getConfig('openai_api_version') || getConfig('AZURE_OAI_API_VERSION'),
    deployment: getConfig('azure_deployment') || getConfig('AZURE_OAI_DEPLOYMENT_GPT'),
    embeddingsDeployment: getConfig('AZURE_OAI_DEPLOYMENT_EMBEDDINGS'),
  };
}

/**
 * Ottiene la chiave Groq
 */
export function getGroqKey(): string | null {
  return getConfig('GROQ_API_KEY');
}

/**
 * Ottiene la chiave XAI
 */
export function getXAIKey(): string | null {
  return getConfig('XAI_API_KEY');
}

/**
 * Ottiene la configurazione Exa API
 */
export function getExaAPIKey(): string | null {
  return getConfig('EXA_API_KEY');
}

/**
 * Ottiene la configurazione Serper API
 */
export function getSerperAPIKey(): string | null {
  return getConfig('SERPER_API_KEY');
}

/**
 * Ottiene la configurazione SerpAPI
 */
export function getSerpAPIKey(): string | null {
  return getConfig('SERPAPI_API_KEY');
}

/**
 * Ottiene la configurazione Tavily API
 */
export function getTavilyAPIKey(): string | null {
  return getConfig('TAVILY_API_KEY');
}

/**
 * Ottiene la configurazione Alpha Vantage
 */
export function getAlphaVantageKey(): string | null {
  return getConfig('ALPHA_VANTAGE_KEY');
}

/**
 * Ottiene la configurazione Wolfram Alpha
 */
export function getWolframAlphaAppId(): string | null {
  return getConfig('WOLFRAM_ALPHA_APPID');
}

/**
 * Ottiene la configurazione Together AI
 */
export function getTogetherAIKey(): string | null {
  return getConfig('TOGETHER_AI');
}

/**
 * Ottiene la configurazione OpenAI-like
 */
export function getOpenAILikeConfig() {
  return {
    baseUrl: getConfig('OPENAI_LIKE_BASE_URL'),
    apiKey: getConfig('OPENAI_LIKE_API_KEY'),
    supportedModels: getConfig('OPENAI_LIKE_SUPPORTED_MODELS'),
  };
}

/**
 * Ottiene la configurazione Open Router
 */
export function getOpenRouterConfig() {
  return {
    key: getConfig('OPEN_ROUTER_KEY'),
    url: getConfig('OPEN_ROUTER_URL'),
  };
}

/**
 * Ottiene il GitHub Token
 */
export function getGitHubToken(): string | null {
  return getConfig('GITHUB_TOKEN');
}

/**
 * Ottiene la chiave Llama Parse
 */
export function getLlamaParseAPIKey(): string | null {
  return getConfig('LLAMA_PARSE_API_KEY');
}

/**
 * Verifica se tutte le configurazioni essenziali sono disponibili
 */
export function validateEssentialConfigs(): {
  isValid: boolean;
  missing: string[];
  available: string[];
} {
  const essentialKeys = [
    'OPENAI_API_KEY',
    'VERTEX_AI',
    'ANTHROPIC_KEY',
  ];

  const missing: string[] = [];
  const available: string[] = [];

  for (const key of essentialKeys) {
    const value = getConfig(key);
    if (value) {
      available.push(key);
    } else {
      missing.push(key);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    available,
  };
}

/**
 * Stampa un report dello stato delle configurazioni
 */
export function printConfigReport(): void {
  console.log('\n📊 REPORT CONFIGURAZIONI KEYVAULT');
  console.log('=' .repeat(50));
  
  if (!isConfigInitialized()) {
    console.log('⚠️ Configurazioni non ancora inizializzate');
    return;
  }

  const validation = validateEssentialConfigs();
  
  console.log(`✅ Configurazioni disponibili: ${validation.available.length}`);
  validation.available.forEach(key => {
    console.log(`   ✓ ${key}`);
  });

  if (validation.missing.length > 0) {
    console.log(`❌ Configurazioni mancanti: ${validation.missing.length}`);
    validation.missing.forEach(key => {
      console.log(`   ✗ ${key}`);
    });
  }

  // Verifica configurazioni specifiche
  const vertexAI = getVertexAICredentials();
  if (vertexAI) {
    console.log('🔧 Vertex AI: Configurato correttamente');
    console.log(`   Project: ${getVertexAIConfig()?.project}`);
    console.log(`   Location: ${getVertexAIConfig()?.location}`);
  }

  const azureConfig = getAzureOpenAIConfig();
  if (azureConfig.apiKey && azureConfig.endpoint) {
    console.log('🔧 Azure OpenAI: Configurato correttamente');
  }

// Esporta anche le funzioni dal modulo principale per convenience
export { isConfigInitialized, initializeConfig, getConfig, getAllConfigs, setConfig, removeConfig, reinitializeConfig } from './index';
