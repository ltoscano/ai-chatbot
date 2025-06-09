# MCP Hub Tool

Questo tool implementa l'integrazione con Model Context Protocol (MCP) Hub utilizzando le librerie ufficiali `@agentic/mcp` e `@agentic/ai-sdk` per una connessione robusta e affidabile tramite Server-Sent Events (SSE).

## Configurazione

Il tool utilizza la variabile d'ambiente `MCP_HUB_URL` definita nel file `.env.local`:

```bash
MCP_HUB_URL=https://agentic.so/tools/mcp
```

## Dipendenze

Il tool richiede le seguenti dipendenze:

```bash
npm install @agentic/mcp @agentic/ai-sdk
```

## Funzionalità

Il tool `mcpHub` supporta due azioni principali:

### 1. Elencare Tools Disponibili

```typescript
{
  action: 'list_tools'
}
```

Questa azione si connette al server MCP e recupera l'elenco di tutti i tools disponibili.

### 2. Eseguire un Tool

```typescript
{
  action: 'call_tool',
  tool_name: 'nome_del_tool',
  tool_parameters: {
    param1: 'valore1',
    param2: 'valore2'
  }
}
```

Questa azione esegue un tool specifico sul server MCP con i parametri forniti.

## Implementazione Tecnica

### Tool Definition (`/lib/ai/tools/mcp-hub.ts`)

Il tool è implementato utilizzando le librerie ufficiali Agentic:

- **`createMcpTools`**: Crea una connessione al server MCP
- **`createAISDKTools`**: Converte i tools MCP in formato AI SDK
- **Cache globale**: Evita connessioni multiple allo stesso server
- **Gestione errori**: Fornisce feedback dettagliato e gestisce riconnessioni automatiche

#### Caratteristiche principali:

```typescript
// Connessione al server MCP tramite SSE
const mcpTools = await createMcpTools({
  name: 'mcp-hub-client',
  version: '1.0.0',
  serverUrl: mcpHubUrl, // Connessione SSE
  rawToolResponses: false, // Compatibilità AI SDK
});

// Conversione in formato AI SDK
const aiSdkTools = createAISDKTools(mcpTools);
```

### Cache e Performance

- **Cache globale**: I client MCP vengono memorizzati in cache per evitare connessioni multiple
- **Gestione errori di connessione**: La cache viene invalidata in caso di errori di rete
- **Timeout automatici**: Prevenzione di connessioni bloccate

### Componente UI (`/components/mcp-hub-result.tsx`)

Componente React per visualizzare i risultati del tool:

- **Lista Tools**: Mostra i tools disponibili con nome, descrizione e parametri
- **Risultati Esecuzione**: Visualizza i risultati dell'esecuzione dei tools
- **Gestione Errori**: Mostra messaggi di errore in modo user-friendly

### Integrazione Chat (`/components/message.tsx`)

Il tool è integrato nel sistema di chat per:

- Mostrare uno stato di caricamento durante l'esecuzione
- Visualizzare i risultati tramite il componente `McpHubResult`
- Gestire gli errori in modo trasparente

## Vantaggi della Nuova Implementazione

### 🔒 **Più Robusto**
- Utilizza librerie ufficiali testate e mantenute
- Gestione automatica di riconnessioni e timeout
- Validazione completa dei dati in ingresso e uscita

### ⚡ **Più Performante**
- Cache intelligente per evitare connessioni multiple
- Connessioni SSE ottimizzate
- Gestione della memoria migliorata

### 🛡️ **Più Sicuro**
- Validazione rigorosa dei parametri
- Gestione sicura delle connessioni
- Timeout per prevenire attacchi DoS

### 🧩 **Più Compatibile**
- Integrazione nativa con AI SDK
- Supporto completo per JSON Schema
- Compatibilità con tutti i server MCP standard

## Esempi di Utilizzo

### Elencare Tools Disponibili

L'utente può chiedere:
> "Quali tools sono disponibili nell'MCP Hub?"

Il sistema chiamerà:
```typescript
mcpHub.execute({ action: 'list_tools' })
```

### Eseguire un Tool

L'utente può chiedere:
> "Esegui il tool 'file_search' con parametro 'pattern': '*.ts'"

Il sistema chiamerà:
```typescript
mcpHub.execute({
  action: 'call_tool',
  tool_name: 'file_search',
  tool_parameters: { pattern: '*.ts' }
})
```

## Architettura di Connessione

```mermaid
graph LR
    A[AI Chatbot] --> B[mcpHub Tool]
    B --> C[@agentic/mcp]
    C --> D[SSE Connection]
    D --> E[MCP Server]
    E --> F[Remote Tools]
```

## Troubleshooting

### Errori Comuni

1. **MCP_HUB_URL non configurato**
   - Verificare che la variabile sia presente in `.env.local`

2. **Connessione fallita**
   - La cache viene automaticamente invalidata
   - Il sistema tenta una riconnessione automatica

3. **Tool non trovato**
   - Usare `list_tools` per vedere i tools disponibili
   - Verificare la corretta scrittura del nome del tool

4. **Timeout di connessione**
   - Il sistema gestisce automaticamente i timeout
   - In caso di problemi persistenti, verificare la connettività di rete

### Debug

Per abilitare il debug delle connessioni MCP:

```bash
DEBUG=@agentic* npm run dev
```
