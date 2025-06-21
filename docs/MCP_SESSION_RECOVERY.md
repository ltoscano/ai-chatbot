# Gestione Automatica degli Errori di Sessione MCP

## Problema Risolto

Quando il server MCP Hub viene riavviato (ad esempio, riavviando il container Docker), il session ID diventa invalido e le successive chiamate ai tool MCP falliscono con l'errore:
```
❌ Failed to discover MCP tools: Error: Error POSTing to endpoint (HTTP 400): {"jsonrpc":"2.0","error":{"code":-32000,"message":"Bad Request: No valid session ID provided"},"id":null}
```

Prima di questa implementazione, era necessario riavviare manualmente l'applicazione per ripristinare la connessione.

## Soluzione Implementata

### 1. Rilevamento Automatico degli Errori di Sessione

Il sistema ora rileva automaticamente gli errori correlati a sessioni invalide:

```typescript
function isSessionError(error: any): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  return (
    errorMessage.includes('Bad Request: No valid session ID provided') ||
    errorMessage.includes('HTTP 400') && errorMessage.includes('session') ||
    errorMessage.includes('session ID') ||
    errorMessage.includes('invalid session')
  );
}
```

### 2. Riconnessione Automatica

Quando viene rilevato un errore di sessione, il sistema:

1. **Pulisce la cache** del client MCP
2. **Crea una nuova connessione** con un nuovo session ID
3. **Riprova l'operazione** automaticamente

```typescript
async function handleSessionError(url: string): Promise<Client> {
  console.log('🔄 Session error detected, clearing cache and reconnecting...');
  
  // Rimuovi il client dalla cache per forzare una nuova connessione
  mcpClientCache.delete(url);
  
  // Crea un nuovo client con una nuova sessione
  return await getMcpClient(url);
}
```

### 3. Implementazione nei Tool MCP

#### Discovery Dinamico (`mcp-dynamic-tools.ts`)

```typescript
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
```

#### Tool MCP Hub (`mcp-hub.ts`)

Ogni azione del tool MCP Hub (list_tools, call_tool, etc.) ora include la gestione automatica degli errori di sessione.

## Funzionalità Aggiuntive

### 1. API di Reset Manuale

Endpoint: `POST /api/mcp/reset?action=reset`

Permette di forzare il reset di tutte le connessioni MCP manualmente.

### 2. Controllo Stato Connessioni

Endpoint: `GET /api/mcp/reset`

Restituisce lo stato attuale delle connessioni MCP:

```json
{
  "success": true,
  "status": "connected",
  "toolsCount": 15,
  "tools": ["mcp_tool1", "mcp_tool2", ...],
  "message": "MCP Hub connected with 15 tools available"
}
```

### 3. Componente UI per Gestione Connessioni

Il componente `McpConnectionManager` fornisce un'interfaccia utente per:
- Controllare lo stato delle connessioni MCP
- Resettare manualmente le connessioni
- Visualizzare il numero di tool disponibili

### 4. Funzione di Reset Completo

```typescript
export function forceResetMcpConnections(): void {
  console.log('🔄 Force resetting all MCP connections...');
  
  // Pulisci la cache dei tool dinamici
  invalidateMcpToolsCache();
  
  // Pulisci la cache dei client MCP
  mcpClientCache.clear();
  
  console.log('✅ All MCP connections and caches cleared');
}
```

## Testing

### Test di Recovery Automatico

Eseguire il test completo:
```bash
node test-session-recovery.js
```

Il test verifica:
1. Connessione iniziale
2. Discovery dinamico dei tool
3. Simulazione di invalidazione sessione
4. Recovery automatico
5. Funzionalità post-recovery

## Vantaggi della Soluzione

### ✅ **Resilienza**
- Il sistema si riprende automaticamente dai riavvii del server MCP
- Non è più necessario riavviare l'applicazione

### ✅ **Trasparenza**
- Gli utenti non vedono interruzioni del servizio
- I tool continuano a funzionare senza intervento manuale

### ✅ **Monitoring**
- Log dettagliati delle riconnessioni
- API per monitorare lo stato delle connessioni

### ✅ **Controllo Manuale**
- Possibilità di forzare il reset delle connessioni
- UI per la gestione delle connessioni

### ✅ **Compatibilità**
- Non modifica l'API esistente dei tool MCP
- Backward compatible con codice esistente

## Scenario di Utilizzo

1. **Riavvio del Container MCP Hub**
   ```bash
   docker restart mcphub-container
   ```

2. **Prima Chiamata dopo il Riavvio**
   - Il sistema rileva l'errore di sessione invalida
   - Pulisce automaticamente la cache
   - Crea una nuova connessione
   - Riprova l'operazione

3. **Risultato**
   - L'operazione ha successo con il nuovo session ID
   - Non è richiesto alcun intervento manuale

## Configurazione

Nessuna configurazione aggiuntiva richiesta. La funzionalità è abilitata automaticamente per tutti i tool MCP che utilizzano:
- `lib/ai/mcp-dynamic-tools.ts`
- `lib/ai/tools/mcp-hub.ts`

La variabile `MCP_HUB_URL` rimane l'unica configurazione necessaria.
