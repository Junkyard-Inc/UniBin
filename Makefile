SHELL := /bin/sh

BUN ?= bun
FRONTEND_DIR := packages/frontend
BACKEND_DIR := packages/backend
FRONTEND_PORT ?= 3000
BACKEND_PORT ?= 3001

export FRONTEND_PORT
export BACKEND_PORT

.DEFAULT_GOAL := help

.PHONY: help dev build frontend-dev backend-dev frontend-build backend-build

help:
	@printf '%s\n' \
		'UniBin - target disponibili:' \
		'' \
		'  make dev              Avvia frontend e backend in development' \
		'  make build            Costruisce frontend e backend' \
		'' \
		'  make frontend-dev     Avvia solo il frontend' \
		'  make backend-dev      Avvia solo il backend' \
		'  make frontend-build   Costruisce solo il frontend' \
		'  make backend-build    Costruisce solo il backend'
	@printf '\nPorte: FRONTEND_PORT=%s BACKEND_PORT=%s\n' "$(FRONTEND_PORT)" "$(BACKEND_PORT)"

dev:
	$(MAKE) --no-print-directory -j2 frontend-dev backend-dev

build: frontend-build backend-build

frontend-dev:
	cd "$(FRONTEND_DIR)" && "$(BUN)" run dev

backend-dev:
	cd "$(BACKEND_DIR)" && "$(BUN)" run dev

frontend-build:
	cd "$(FRONTEND_DIR)" && "$(BUN)" run build

backend-build:
	cd "$(BACKEND_DIR)" && "$(BUN)" run build
