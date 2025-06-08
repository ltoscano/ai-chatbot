/**
 * Esempio di utilizzo del modulo keyvault generico
 * Questo file dimostra come accedere alle configurazioni dal keyvault
 */

import { getConfig, getAllConfigs, isConfigInitialized } from '@/lib/keyvault';

// Esempio: Ottieni una chiave specifica
export function getExampleAPIKey(): string | null {
  return getConfig('EXA_API_KEY');
}

// Esempio: Ottieni una configurazione con fallback a variabile d'ambiente
export function getOpenAIKey(): string | null {
  return getConfig('OPENAI_API_KEY') || process.env.OPENAI_API_KEY || null;
}

// Esempio: Gestisci array (come VERTEX_AI)
export function getVertexAICredentials() {
  // Primo elemento dell'array VERTEX_AI
  return getConfig('VERTEX_AI_0');
}

export function getVertexAIConfig() {
  // Secondo elemento dell'array VERTEX_AI
  return getConfig('VERTEX_AI_1');
}

// Esempio: Ottieni l'array completo
export function getVertexAIFullArray() {
  return getConfig('VERTEX_AI');
}

// Esempio: Controllo dello stato di inizializzazione
export function checkConfigStatus() {
  if (!isConfigInitialized()) {
    console.log('⚠️ Configurazioni non ancora caricate dal keyvault');
    return false;
  }
  return true;
}

// Esempio: Debug - mostra tutte le configurazioni disponibili
export function debugConfigurations() {
  if (!isConfigInitialized()) {
    console.log('⚠️ Keyvault non ancora inizializzato');
    return;
  }

  const allConfigs = getAllConfigs();
  console.log(
    '📋 Configurazioni disponibili:',
    Array.from(allConfigs.keys()).sort(),
  );

  // Mostra solo le chiavi, non i valori per sicurezza
  allConfigs.forEach((value, key) => {
    const isArray = Array.isArray(value);
    const hasValue = value !== null && value !== undefined;
    console.log(
      `  ${key}: ${hasValue ? (isArray ? `array[${value.length}]` : 'disponibile') : 'non disponibile'}`,
    );
  });
}

// Esempio: Uso condizionale delle configurazioni
export function createDynamicConfig() {
  const config: any = {};

  // Aggiungi configurazioni solo se disponibili
  const openaiKey = getConfig('OPENAI_API_KEY');
  if (openaiKey) {
    config.openai = { apiKey: openaiKey };
  }

  const anthropicKey = getConfig('ANTHROPIC_KEY');
  if (anthropicKey) {
    config.anthropic = { apiKey: anthropicKey };
  }

  const groqKey = getConfig('GROQ_API_KEY');
  if (groqKey) {
    config.groq = { apiKey: groqKey };
  }

  // Per array come Azure OpenAI, puoi creare configurazioni dinamiche
  const azureEndpoint =
    getConfig('AZURE_OPENAI_ENDPOINT') || getConfig('AZURE_OAI_ENDPOINT');
  const azureKey =
    getConfig('AZURE_OPENAI_API_KEY') || getConfig('AZURE_OAI_API_KEY');
  if (azureEndpoint && azureKey) {
    config.azure = {
      endpoint: azureEndpoint,
      apiKey: azureKey,
      apiVersion: getConfig('AZURE_OAI_API_VERSION') || '2024-02-01',
    };
  }

  return config;
}
