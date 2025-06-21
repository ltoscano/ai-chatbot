#!/bin/bash

# Script per sincronizzare .env.local con .env.docker
# Adatta gli hostname per l'ambiente Docker

echo "Sincronizzando .env.local -> .env.docker..."

# Copia il file base
cp .env.local .env.docker

# Sostituisci gli hostname per Docker
sed -i '' 's|localhost:5432|postgres:5432|g' .env.docker
sed -i '' 's|http://blob-server:8000|http://blob-server:8000|g' .env.docker
sed -i '' 's|http://localhost:8001|http://mcphub:3000|g' .env.docker
sed -i '' 's|http://gpts-keyvault:38680|http://gpts-keyvault:38680|g' .env.docker

# Aggiungi commento di header
sed -i '' '1i\
# File generato automaticamente da .env.local per ambiente Docker\
# Non modificare direttamente - usa sync-env.sh\
\
' .env.docker

echo "✅ Sincronizzazione completata!"
echo "📋 Verifica le differenze:"
echo ""
echo "=== .env.local ==="
head -5 .env.local
echo ""
echo "=== .env.docker ==="
head -8 .env.docker
