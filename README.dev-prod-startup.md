Per avviare in modalità produzione:
TARGET_STAGE=production NODE_ENV=production docker-compose -f docker-compose.yml -f docker-compose.prod.yml up

Di default il docker-compose.yml è configurato per un avviamento in dev mode.

