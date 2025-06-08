/**
 * Modulo per la gestione delle configurazioni globali dal Keyvault
 * Viene inizializzato all'avvio dell'applicazione e mantiene un cache
 * di tutte le variabili di configurazione.
 * Le configurazioni vengono automaticamente caricate come variabili di ambiente.
 */

interface KeyvaultResponse {
  keys: string[];
}

interface KeyValueResponse {
  [key: string]: any;
}

// Cache globale delle configurazioni
const configCache = new Map<string, any>();
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Ottiene l'elenco di tutte le chiavi disponibili nel keyvault
 */
async function getAvailableKeys(): Promise<string[]> {
  const keyvaultUrl = process.env.KEYVAULT_URL;
  if (!keyvaultUrl) {
    console.warn("⚠️ KEYVAULT_URL non trovato nelle variabili d'ambiente");
    return [];
  }

  try {
    const response = await fetch(`${keyvaultUrl}/list_keys`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: KeyvaultResponse = await response.json();
    console.log(
      `🔑 Trovate ${data.keys.length} chiavi nel keyvault:`,
      data.keys,
    );
    return data.keys;
  } catch (error) {
    console.error('❌ Errore nel recupero delle chiavi dal keyvault:', error);
    return [];
  }
}

/**
 * Ottiene il valore di una specifica chiave dal keyvault
 */
async function getKeyValue(key: string): Promise<any> {
  const keyvaultUrl = process.env.KEYVAULT_URL;
  if (!keyvaultUrl) {
    console.warn(
      `⚠️ KEYVAULT_URL non trovato, fallback a variabile d'ambiente per ${key}`,
    );
    return process.env[key] || null;
  }

  try {
    const response = await fetch(`${keyvaultUrl}/get_key/${key}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: KeyValueResponse = await response.json();
    return data[key];
  } catch (error) {
    console.error(`❌ Errore nel recupero della chiave ${key}:`, error);
    console.warn(`⚠️ Fallback a variabile d'ambiente per ${key}`);
    return process.env[key] || null;
  }
}

/**
 * Processa i valori delle chiavi, gestendo array e creando variabili indicizzate
 * Assegna i valori direttamente a process.env per renderli disponibili come variabili di ambiente
 */
function processKeyValue(key: string, value: any): void {
  if (Array.isArray(value)) {
    // Se è un array, crea variabili indicizzate in process.env
    value.forEach((item, index) => {
      const indexedKey = `${key}_${index}`;
      const stringValue =
        typeof item === 'string' ? item : JSON.stringify(item);
      process.env[indexedKey] = stringValue;
      configCache.set(indexedKey, item);
      console.log(`📦 Variabile di ambiente creata: ${indexedKey}`);
    });

    // Salva anche l'array originale come JSON string in process.env
    const arrayAsString = JSON.stringify(value);
    process.env[key] = arrayAsString;
    configCache.set(key, value);
    console.log(
      `📦 Variabile di ambiente creata: ${key} (array con ${value.length} elementi)`,
    );
  } else {
    // Valore singolo - converte in stringa per process.env
    const stringValue =
      typeof value === 'string' ? value : JSON.stringify(value);
    process.env[key] = stringValue;
    configCache.set(key, value);
    console.log(`📦 Variabile di ambiente creata: ${key}`);
  }
}

/**
 * Inizializza tutte le configurazioni dal keyvault
 */
async function initializeConfig(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Se l'inizializzazione è già in corso, aspetta che finisca
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    try {
      console.log('🚀 Inizializzazione configurazioni dal keyvault...');

      // Ottieni tutte le chiavi disponibili
      const keys = await getAvailableKeys();

      if (keys.length === 0) {
        console.warn(
          "⚠️ Nessuna chiave trovata nel keyvault, usando solo variabili d'ambiente",
        );
        isInitialized = true;
        return;
      }

      // Carica il valore di ogni chiave
      const promises = keys.map(async (key) => {
        try {
          const value = await getKeyValue(key);
          if (value !== null && value !== undefined) {
            processKeyValue(key, value);
          } else {
            console.warn(`⚠️ Valore nullo o undefined per la chiave: ${key}`);
          }
        } catch (error) {
          console.error(`❌ Errore nel processare la chiave ${key}:`, error);
        }
      });

      await Promise.all(promises);
      isInitialized = true;
      console.log(
        `✅ Configurazioni inizializzate con successo! Caricate ${configCache.size} configurazioni come variabili di ambiente.`,
      );

      // Debug: mostra tutte le chiavi caricate
      console.log(
        '📋 Variabili di ambiente create dal keyvault:',
        Array.from(configCache.keys()).sort(),
      );
    } catch (error) {
      console.error(
        "❌ Errore critico nell'inizializzazione delle configurazioni:",
        error,
      );
      isInitialized = true; // Evita retry infiniti
    }
  })();

  return initializationPromise;
}

/**
 * Ottiene il valore di una configurazione dal cache
 */
export function getConfig(key: string): any {
  if (!isInitialized) {
    console.warn(
      `⚠️ Configurazioni non ancora inizializzate, fallback a variabile d'ambiente per ${key}`,
    );
    return process.env[key] || null;
  }

  const value = configCache.get(key);
  if (value === undefined) {
    console.warn(
      `⚠️ Configurazione ${key} non trovata nel cache, fallback a variabile d'ambiente`,
    );
    return process.env[key] || null;
  }

  return value;
}

/**
 * Ottiene tutte le configurazioni dal cache
 */
export function getAllConfigs(): Map<string, any> {
  return new Map(configCache);
}

/**
 * Verifica se le configurazioni sono state inizializzate
 */
export function isConfigInitialized(): boolean {
  return isInitialized;
}

/**
 * Aggiorna una configurazione nel cache e in process.env (utile per test o aggiornamenti runtime)
 */
export function setConfig(key: string, value: any): void {
  // Aggiorna sia il cache che process.env
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  process.env[key] = stringValue;
  configCache.set(key, value);
  console.log(`📝 Configurazione e variabile di ambiente aggiornate: ${key}`);
}

/**
 * Rimuove una configurazione dal cache e da process.env
 */
export function removeConfig(key: string): boolean {
  const removed = configCache.delete(key);
  if (removed) {
    delete process.env[key];
    console.log(`🗑️ Configurazione e variabile di ambiente rimosse: ${key}`);
  }
  return removed;
}

/**
 * Forza una reinizializzazione delle configurazioni
 * Pulisce sia il cache che le variabili di ambiente create dal keyvault
 */
export async function reinitializeConfig(): Promise<void> {
  // Rimuovi le variabili di ambiente create dal keyvault
  configCache.forEach((_, key) => {
    delete process.env[key];
  });

  isInitialized = false;
  initializationPromise = null;
  configCache.clear();
  console.log('🔄 Reinizializzazione delle configurazioni...');
  await initializeConfig();
}

/**
 * Ottiene il valore originale (tipizzato) di una configurazione dal cache
 * Utile quando hai bisogno del tipo originale invece della stringa di process.env
 */
export function getOriginalConfig(key: string): any {
  if (!isInitialized) {
    console.warn(`⚠️ Configurazioni non ancora inizializzate per ${key}`);
    return null;
  }

  return configCache.get(key);
}

// Inizializza automaticamente quando il modulo viene importato
initializeConfig().catch((error) => {
  console.error(
    "❌ Errore nell'inizializzazione automatica delle configurazioni:",
    error,
  );
});

// Esporta la funzione di inizializzazione per uso esplicito se necessario
export { initializeConfig };
