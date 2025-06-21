# Docker Development Setup

Questo progetto include una configurazione Docker ottimizzata per sviluppo e produzione.

## 🚀 Modalità Sviluppo (con Hot Reload)

Per avviare l'ambiente di sviluppo con hot reload:

```bash
# Usando gli script npm
npm run docker:dev

# Oppure direttamente con docker-compose
TARGET_STAGE=development NODE_ENV=development docker-compose up --build

# Oppure usando lo script bash
./scripts/dev.sh
```

### Caratteristiche della modalità sviluppo:
- ✅ Hot reload automatico quando modifichi il codice
- ✅ Volume mount della directory di progetto
- ✅ Node modules e .next cachati per performance migliori
- ✅ Turbo mode di Next.js attivato
- ✅ Debugging abilitato

## 🏭 Modalità Produzione

Per avviare l'ambiente di produzione:

```bash
# Usando gli script npm
npm run docker:prod

# Oppure direttamente con docker-compose
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

# Oppure usando lo script bash
./scripts/prod.sh
```

### Caratteristiche della modalità produzione:
- ✅ Build ottimizzato per produzione
- ✅ Immagine Docker più leggera
- ✅ Nessun volume mount (sicurezza)
- ✅ Ottimizzazioni Next.js abilitate

## 🛠 Comandi Utili

```bash
# Fermare i container
npm run docker:stop

# Pulizia completa (rimuove volumi e immagini)
npm run docker:clean

# Vedere i log in tempo reale
docker-compose logs -f app

# Accedere al container in esecuzione
docker exec -it ai-chatbot-app sh

# Ricostruire solo l'app
docker-compose up --build app
```

## 📁 Struttura Volumi

### Sviluppo:
- `./:/app:cached` - Codice sorgente con cache per performance
- `/app/node_modules` - Node modules isolati nel container
- `/app/.next` - Build cache di Next.js

### Produzione:
- Nessun volume mount per sicurezza
- Tutto incluso nell'immagine Docker

## 🔧 Configurazione

Le configurazioni sono controllate tramite variabili d'ambiente:

- `TARGET_STAGE`: `development` o `production`
- `NODE_ENV`: `development` o `production`
- `DOCKER_COMMAND`: comando da eseguire nel container

## 🐛 Troubleshooting

### Il hot reload non funziona?
1. Verifica che Docker abbia accesso alla directory del progetto
2. Su macOS, assicurati che la directory sia in "File Sharing" nelle preferenze Docker
3. Prova a riavviare Docker Desktop

### Performance lente?
1. Assicurati di usare `:cached` nel volume mount
2. Aumenta la memoria assegnata a Docker (minimo 4GB)
3. Considera l'uso di Docker Desktop con VirtioFS su macOS

### Problemi di permessi?
I container usano l'utente `nextjs` (uid 1001) per sicurezza. Se hai problemi di permessi:
```bash
sudo chown -R 1001:1001 .next node_modules
```
