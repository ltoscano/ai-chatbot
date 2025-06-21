#!/bin/bash

# Script per avviare l'ambiente di produzione

echo "🏭 Avvio ambiente di produzione..."

# Imposta le variabili d'ambiente per production
export TARGET_STAGE=production
export NODE_ENV=production

# Avvia i servizi con il file di override per produzione
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

echo "✅ Ambiente di produzione avviato!"
echo "🌐 App disponibile su: http://localhost:3000"
