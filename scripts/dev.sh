#!/bin/bash

# Script per avviare l'ambiente di sviluppo con hot reload

echo "🚀 Avvio ambiente di sviluppo con hot reload..."

# Imposta le variabili d'ambiente per development
export TARGET_STAGE=development
export NODE_ENV=development
export DOCKER_COMMAND="npm run dev"

# Avvia i servizi
docker-compose up --build

echo "✅ Ambiente di sviluppo avviato!"
echo "📝 Le modifiche al codice verranno ricaricate automaticamente"
echo "🌐 App disponibile su: http://localhost:3000"
