SHELL := /bin/sh

FRONTEND_DIR := packages/frontend
BACKEND_DIR := packages/backend
NGINX_DIR := deploy/nginx
FRONTEND_PORT ?= 3000
BACKEND_PORT ?= 3001

# IP della LAN incluso nei SAN del certificato (default: primo di `hostname -I`)
IP ?= $(shell hostname -I 2>/dev/null | awk '{print $$1}')

export FRONTEND_PORT
export BACKEND_PORT

.DEFAULT_GOAL := help

.PHONY: help dev build test cert cert-force certs-ensure \
       frontend-dev backend-dev frontend-build backend-build \
       prod-server prod-proxy prod-proxy-stop

help:
	@printf '%s\n' \
		'UniBin - target disponibili:' \
		'' \
		'  make dev              Avvia frontend e backend in development' \
		'  make build            Costruisce frontend e backend' \
		'  make test             Esegue i test' \
		'' \
		'  make frontend-dev     Avvia solo il frontend' \
		'  make backend-dev      Avvia solo il backend' \
		'  make frontend-build   Costruisce solo il frontend' \
		'  make backend-build    Costruisce solo il backend' \
		'' \
		'  make cert             Genera la CA locale e il certificato server' \
		'  make cert-force       Rigenera anche la CA (IP=... per cambiare IP)' \
		'' \
		'  make prod-server      Avvia il frontend di produzione (solo localhost)' \
		'  make prod-proxy       Avvia nginx su HTTPS/443 (richiede cert)' \
		'  make prod-proxy-stop  Ferma nginx'
	@printf '\nPorte: FRONTEND_PORT=%s BACKEND_PORT=%s  IP=%s\n' "$(FRONTEND_PORT)" "$(BACKEND_PORT)" "$(IP)"

dev: certs-ensure
	$(MAKE) --no-print-directory -j2 frontend-dev backend-dev

build: frontend-build backend-build

test:
	bun test

# --- Certificati -------------------------------------------------------------

# Genera CA + leaf. Usare IP=<indirizzo> per forzare l'IP nei SAN.
cert:
	bash scripts/gen-certs.sh "$(IP)"

# Rigenera anche la CA locale (i dispositivi dovranno reinstallare certs/ca.crt).
cert-force:
	FORCE_CA=1 bash scripts/gen-certs.sh "$(IP)"

# Genera i certificati solo se mancanti (usato da `make dev`).
certs-ensure:
	@if [ ! -f certs/unibin.crt ] || [ ! -f certs/unibin.key ]; then \
		echo 'Certificati assenti, li genero...'; \
		bash scripts/gen-certs.sh "$(IP)"; \
	fi

# --- Development -------------------------------------------------------------

frontend-dev:
	cd "$(FRONTEND_DIR)" && bun run dev

backend-dev:
	cd "$(BACKEND_DIR)" && bun run dev

frontend-build:
	cd "$(FRONTEND_DIR)" && bun run build

backend-build:
	cd "$(BACKEND_DIR)" && bun run build

# --- Produzione --------------------------------------------------------------

prod-server: certs-ensure
	cd "$(FRONTEND_DIR)" && bun run start

prod-proxy: certs-ensure
	docker compose -f "$(NGINX_DIR)/docker-compose.yml" up -d

prod-proxy-stop:
	docker compose -f "$(NGINX_DIR)/docker-compose.yml" down
