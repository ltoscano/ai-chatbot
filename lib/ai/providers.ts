/**
 * Providers AI configurati automaticamente con keyvault
 *
 * Il modulo keyvault carica automaticamente tutte le configurazioni in process.env,
 * quindi i provider possono accedere direttamente alle variabili di ambiente
 * senza bisogno di chiamate asincrone o gestione del cache.
 *
 * Configurazioni supportate dal keyvault:
 * - OPENAI_API_KEY: Chiave API per OpenAI
 * - VERTEX_AI (array): [credenziali_json, {project, location}]
 *   - VERTEX_AI_0: Credenziali JSON per Google Cloud
 *   - VERTEX_AI_1: Configurazione {project, location}
 */

import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createVertex } from '@ai-sdk/google-vertex';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
// Importa solo per forzare l'inizializzazione del keyvault
import '../keyvault';

// Funzione di utilità per parsare le credenziali Vertex AI dal keyvault
function parseVertexCredentials() {
  try {
    // Le credenziali Vertex AI vengono caricate come VERTEX_AI_0 e VERTEX_AI_1 dal keyvault
    const credentialsStr = process.env.VERTEX_AI_0;
    const configStr = process.env.VERTEX_AI_1;

    if (credentialsStr && configStr) {
      const credentials =
        typeof credentialsStr === 'string'
          ? JSON.parse(credentialsStr)
          : credentialsStr;
      const config =
        typeof configStr === 'string' ? JSON.parse(configStr) : configStr;

      return { credentials, config };
    }
  } catch (error) {
    console.warn(
      '⚠️ Errore nel parsing delle credenziali Vertex AI dal keyvault:',
      error,
    );
  }
  return null;
}

// Inizializza provider usando direttamente process.env (ora popolato dal keyvault)
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  compatibility: 'strict',
});

// Configura Vertex AI con credenziali dal keyvault o fallback alle variabili di ambiente
const vertexConfig = parseVertexCredentials();
const vertexGemini = vertexConfig
  ? createVertex({
      googleAuthOptions: {
        credentials: vertexConfig.credentials,
      },
      project: vertexConfig.config.project,
      location: vertexConfig.config.location,
    })
  : createVertex({
      project: process.env.GOOGLE_VERTEX_PROJECT || 'default-project',
      location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
    });

const vertexAnthropic = vertexConfig
  ? createVertexAnthropic({
      googleAuthOptions: {
        credentials: vertexConfig.credentials,
      },
      project: vertexConfig.config.project,
      location: vertexConfig.config.location,
    })
  : createVertexAnthropic({
      project: process.env.GOOGLE_VERTEX_PROJECT || 'default-project',
      location: process.env.GOOGLE_VERTEX_LOCATION || 'us-central1',
    });

// Log della configurazione utilizzata
if (vertexConfig) {
  console.log('✅ Vertex AI configurato con credenziali dal keyvault');
} else {
  console.log('⚠️ Vertex AI configurato con variabili di ambiente di default');
}

if (process.env.OPENAI_API_KEY) {
  console.log(
    '✅ OpenAI configurato con chiave da process.env (keyvault o .env)',
  );
} else {
  console.warn('⚠️ OPENAI_API_KEY non trovata in process.env');
}

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': openai('gpt-4o'),
        'chat-model-reasoning': wrapLanguageModel({
          model: openai('o1-mini'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-4o-mini'),
        'artifact-model': openai('gpt-4o'),
        'gemini-pro': vertexGemini('gemini-1.5-pro'),
        'claude-anthropic': vertexAnthropic('claude-sonnet-4@20250514'),
      },
      imageModels: {
        'small-model': openai.image('dall-e-3'),
      },
    });
