# Nginx Reverse Proxy Configuration

Questo progetto utilizza nginx come reverse proxy per intercettare specifici percorsi sulla porta 3000 e instradarli ai servizi containerizzati appropriati.

## Architettura

### **Routing su localhost:3000**
- **http://localhost:3000/mcp** - Instradato a `mcphub:3000/mcp`
- **http://localhost:3000/blob** - Instradato a `blob-server:8000/blob`
- **http://localhost:3000/** - Instradato all'app Next.js principale (fallback)

### **Porte Esposte**
- **3000**: Nginx proxy (gestisce tutti i routing)
- **5432**: PostgreSQL database

### **Servizi Interni**
- `ai-chatbot-app:3000` - Applicazione Next.js principale (solo interno)
- `blob-server:8000` - Server per gestione file/blob (solo interno)
- `mcphub:3000` - MCP Hub service (solo interno)
- `ai-chatbot-postgres:5432` - Database PostgreSQL

## Configurazione

Il file `nginx/nginx.conf` definisce il routing intelligente sulla porta 3000:

1. **Location-based routing**:
   - `/mcp` → `mcphub:3000/mcp`
   - `/blob` → `blob-server:8000/blob`
   - `/` → `ai-chatbot-app:3000` (fallback per tutto il resto)

2. **SSE support**: Configurazione speciale per Server-Sent Events (MCP Hub)
3. **Proxy headers**: Headers appropriati per il proxying

## Utilizzo

1. Avvia tutti i servizi:
   ```bash
   docker-compose up -d
   ```

2. Tutti i servizi sono accessibili tramite `localhost:3000`:
   - **App principale**: http://localhost:3000
   - **MCP Hub**: http://localhost:3000/mcp
   - **Blob server**: http://localhost:3000/blob

## Vantaggi di questa Configurazione

- ✅ **Porta unica**: Tutto accessibile tramite `localhost:3000`
- ✅ **Routing trasparente**: I percorsi vengono instradati automaticamente
- ✅ **Isolamento servizi**: I servizi interni non sono esposti direttamente
- ✅ **Sviluppo semplificato**: Un solo endpoint da ricordare

## Note

- I servizi interni non espongono porte pubbliche (usano `expose` invece di `ports`)
- Tutto il traffico passa attraverso nginx per maggiore controllo e sicurezza
- La configurazione supporta SSE per il MCP Hub
- I servizi blob-server, mcphub e gpts-keyvault devono essere buildati o pull-ati separatamente

## Troubleshooting

Se i servizi non sono raggiungibili:

1. Verifica che tutti i container siano running:
   ```bash
   docker-compose ps
   ```

2. Controlla i logs di nginx:
   ```bash
   docker-compose logs nginx
   ```

3. Verifica la connettività interna:
   ```bash
   docker-compose exec nginx nslookup ai-chatbot-app
   ```
